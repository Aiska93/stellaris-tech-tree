"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TechCard } from "./TechCard";
import {
  DLC_BY_ID,
  TECHS,
  TECH_BY_KEY,
  TIER_COLORS,
  TIER_LABELS,
  TRACE_NEXT_COLOR,
  TRACE_PREREQ_COLOR,
  columnOf,
  type Tech,
} from "@/lib/techtree";
import {
  TIER_UNLOCK_COUNT,
  type TechOdds,
} from "@/lib/myEmpire";
import type { PresetRating } from "@/lib/presets";

interface Edge {
  id: string;
  d: string;
  dlcId: string | null;
  target: string;
  source: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface AreaSectionProps {
  id: string;
  title: string;
  accent: string;
  /** techs passing DLC + search filters (NOT the hide-acquired filter) */
  techs: Tech[];
  /** techs counted for the header progress (ignores "hide acquired") */
  countTechs: Tech[];
  acquired: Set<string>;
  hideAcquired: boolean;
  categoryOrder: string[];
  /** tech key traced via selection (persists until dismissed) */
  spotlightKey: string | null;
  /** tech keys lightly highlighted because a researched tech unlocks them */
  readyKeys: Set<string>;
  /** tech keys that cannot be selected right now (missing prereqs / tier gate / empire lock) */
  blockedKeys: ReadonlySet<string>;
  /** tech key briefly flashed after a prerequisite redirect */
  flashKey: string | null;
  /** tech key currently hovered (transient) */
  hoverKey: string | null;
  /** research-appearance odds per tech key ("My Empire" + progress aware) */
  oddsMap?: Map<string, TechOdds> | null;
  /** render the odds badges? (global toggle) */
  showOdds?: boolean;
  /** playstyle ratings (null = no preset active) */
  ratingsMap?: ReadonlyMap<string, PresetRating> | null;
  /** techs on the planned path to the goal (missing prerequisites) */
  plannedKeys?: ReadonlySet<string>;
  /** the path-planner goal tech key */
  goalKey?: string | null;
  /** set / clear the path-planner goal */
  onSetGoal?: (key: string | null) => void;
  /** techs permanently known from the start by the applied empire */
  permanentKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onHover: (tech: Tech | null, el: HTMLElement | null) => void;
}

/* layout constants for the lane matrix */
const LABEL_W = 132; // sticky category label rail
const CELL_COLS = 3; // cards side-by-side inside a tier cell
/*
 * Uniform card size — every tech box in every tier has EXACTLY this size,
 * based on the longest technology name in the data ("Transcendental
 * Innovation Department"): at 9.5px font it wraps into two lines within
 * 116px of text, so 116 + 4/6 row padding + 4px chip padding + 50 icon
 * rail = 180px wide. No name is ever truncated.
 */
export const CARD_W = 180;
const CARD_H = 68;
/* same gap between cards horizontally and vertically */
const CARD_GAP = 6;
const COL_W = CELL_COLS * CARD_W + (CELL_COLS - 1) * CARD_GAP;
const GAP_X = 14; // horizontal gap between columns
/* extra breathing room between category lanes so rows are clearly separated */
const LANE_GAP = 28;

/**
 * Techs that are a prerequisite of a same-COLUMN tech which lives in another
 * cell (different category, or a different section such as events). Within
 * their own cell they get hoisted to the very front (leftmost card slot),
 * so the dependent — which may occupy any slot of its own cell in a
 * neighbouring lane — can never start further left than they do.
 */
const CROSS_CELL_PREREQS: ReadonlySet<string> = (() => {
  const sectionOf = (t: Tech) => (t.event ? "events" : t.area);
  const s = new Set<string>();
  for (const t of TECHS) {
    for (const p of t.prereqs) {
      const pt = TECH_BY_KEY.get(p);
      if (!pt) continue;
      if (
        columnOf(pt) === columnOf(t) &&
        (sectionOf(pt) !== sectionOf(t) || pt.cat !== t.cat)
      ) {
        s.add(p);
      }
    }
  }
  return s;
})();

/**
 * Order the techs of one tier cell so reading never runs backwards along a
 * dependency chain: prerequisites always come before the techs that need
 * them (in-cell dependency depth first, then cost, then name). Combined with
 * the column-major grid fill below, a prerequisite is never placed to the
 * right of — or below-right of — its dependent inside the cell.
 */
const orderCell = (list: Tech[]): Tech[] => {
  if (list.length < 2) return list.slice();
  const byKey = new Map(list.map((t) => [t.key, t]));
  const depth = new Map<string, number>();
  const depthOf = (t: Tech, seen: Set<string>): number => {
    const hit = depth.get(t.key);
    if (hit != null) return hit;
    if (seen.has(t.key)) return 0; // cycle guard
    seen.add(t.key);
    let d = 0;
    for (const p of t.prereqs) {
      const pt = byKey.get(p);
      if (pt) d = Math.max(d, depthOf(pt, seen) + 1);
    }
    seen.delete(t.key);
    depth.set(t.key, d);
    return d;
  };
  const ordered = list
    .map((t) => ({ t, d: depthOf(t, new Set()) }))
    .sort(
      (x, y) =>
        x.d - y.d ||
        x.t.cost - y.t.cost ||
        x.t.name.localeCompare(y.t.name),
    )
    .map((x) => x.t);
  /* Hoist cross-cell same-column prerequisites to the front of the cell
     (never past their own in-cell prerequisites) so they occupy the
     leftmost card slot — their dependents in neighbouring lanes can then
     never start to the left of them. */
  const inCell = new Set(ordered.map((t) => t.key));
  for (const t of ordered.slice()) {
    if (!CROSS_CELL_PREREQS.has(t.key)) continue;
    const idx = ordered.indexOf(t);
    let insertAt = 0;
    for (const p of t.prereqs) {
      if (!inCell.has(p)) continue;
      const pi = ordered.findIndex((x) => x.key === p);
      if (pi >= 0 && pi < idx) insertAt = Math.max(insertAt, pi + 1);
    }
    if (insertAt < idx) {
      ordered.splice(idx, 1);
      ordered.splice(insertAt, 0, t);
    }
  }
  return ordered;
};

export function AreaSection({
  id,
  title,
  accent,
  techs,
  countTechs,
  acquired,
  hideAcquired,
  categoryOrder,
  spotlightKey,
  readyKeys,
  blockedKeys,
  flashKey,
  hoverKey,
  oddsMap,
  showOdds,
  ratingsMap,
  plannedKeys,
  goalKey,
  onSetGoal,
  permanentKeys,
  onToggle,
  onHover,
}: AreaSectionProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  /* known-width probe used to measure the tree zoom actually applied to
     this subtree (CSS `zoom` scales getBoundingClientRect() results) */
  const probeRef = useRef<HTMLSpanElement>(null);
  const [edges, setEdges] = useState<Edge[]>([]);

  // When "hide acquired" is off this keeps the same array identity across
  // toggles, so connector lines are NOT recomputed on every click.
  const renderedTechs = useMemo(
    () =>
      hideAcquired
        ? techs.filter((t) => !acquired.has(t.key))
        : techs,
    [techs, hideAcquired, acquired],
  );

  /* ---------- lane structure: rows = categories, columns = tiers ---------- */
  // Rows are derived from `techs` (pre-hide) so lanes stay stable while toggling.
  // Cells key by the *layout column* (columnOf), which equals the tier except
  // for the handful of techs whose prerequisites sit in a later tier column.
  const lanes = useMemo(() => {
    const catIndex = new Map(categoryOrder.map((c, i) => [c, i]));
    const cats = new Map<string, Map<number, Tech[]>>();
    for (const t of techs) {
      if (!cats.has(t.cat)) cats.set(t.cat, new Map());
      const byCol = cats.get(t.cat)!;
      const col = columnOf(t);
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(t);
    }
    return [...cats.entries()]
      .sort((a, b) => (catIndex.get(a[0]) ?? 99) - (catIndex.get(b[0]) ?? 99))
      .map(([cat, byCol]) => {
        // sort each cell and compute its height in card rows
        const cells = TIER_LABELS.map((_, col) => {
          const list = orderCell(byCol.get(col) ?? []);
          const rows = Math.ceil(list.length / CELL_COLS);
          return { list, rows };
        });
        const count = [...byCol.values()].reduce((n, l) => n + l.length, 0);
        return { cat, cells, count, rows: Math.max(...cells.map((c) => c.rows)) };
      });
  }, [techs, categoryOrder]);

  // cells actually rendered (respects "hide acquired"), ordered so
  // prerequisites always precede their dependents inside the cell
  const renderedCells = useMemo(() => {
    const m = new Map<string, Tech[]>();
    for (const t of renderedTechs) {
      const k = `${t.cat}|${columnOf(t)}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    for (const [k, list] of m) {
      m.set(k, orderCell(list));
    }
    return m;
  }, [renderedTechs]);

  /* ---------- edge geometry ---------- */
  const computeEdges = useCallback((list: Tech[]) => {
    const grid = gridRef.current;
    if (!grid) return;
    const gr = grid.getBoundingClientRect();
    /*
     * The tree zoom is a CSS `zoom` on an ancestor. getBoundingClientRect()
     * returns VISUAL (post-zoom) pixels, but the connector SVG lives in the
     * grid's LOCAL (pre-zoom) coordinate space and is scaled together with
     * the cards. Measure the applied scale with the fixed-width probe and
     * divide the visual offsets back into local space, so the lines stay
     * glued to both ends at every zoom level — including when a persisted
     * zoom != 100% is restored on load in a fresh tab.
     */
    const probe = probeRef.current;
    const probeW = probe ? probe.getBoundingClientRect().width : 0;
    const scale = probeW > 0 ? probeW / 100 : 1;
    const k = scale > 0 ? 1 / scale : 1;
    const pos = new Map<
      string,
      { right: number; left: number; cx: number; top: number; bottom: number; cy: number }
    >();
    grid
      .querySelectorAll<HTMLElement>("[data-tech-key]")
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        pos.set(el.dataset.techKey ?? "", {
          left: (r.left - gr.left) * k,
          right: (r.right - gr.left) * k,
          cx: (r.left + r.width / 2 - gr.left) * k,
          top: (r.top - gr.top) * k,
          bottom: (r.bottom - gr.top) * k,
          cy: (r.top + r.height / 2 - gr.top) * k,
        });
      });
    const out: Edge[] = [];
    const gap = 6;
    for (const t of list) {
      for (const p of t.prereqs) {
        const a = pos.get(p);
        const b = pos.get(t.key);
        if (!a || !b) continue;
        let d: string;
        let x1: number;
        let y1: number;
        let x2: number;
        let y2: number;
        if (b.left >= a.right - gap) {
          // child sits to the right: classic horizontal connector
          const mx = (a.right + b.left) / 2;
          d = `M ${a.right} ${a.cy} C ${mx} ${a.cy}, ${mx} ${b.cy}, ${b.left} ${b.cy}`;
          x1 = a.right;
          y1 = a.cy;
          x2 = b.left;
          y2 = b.cy;
        } else if (b.right <= a.left + gap) {
          // child wrapped to the left within the same cell: right-to-left hook
          const mx = (a.left + b.right) / 2;
          d = `M ${a.left} ${a.cy} C ${mx} ${a.cy}, ${mx} ${b.cy}, ${b.right} ${b.cy}`;
          x1 = a.left;
          y1 = a.cy;
          x2 = b.right;
          y2 = b.cy;
        } else if (b.top >= a.bottom - gap) {
          // child directly below: vertical connector
          const dy = Math.min(36, Math.max(12, (b.top - a.bottom) / 2));
          d = `M ${a.cx} ${a.bottom} C ${a.cx} ${a.bottom + dy}, ${b.cx} ${b.top - dy}, ${b.cx} ${b.top}`;
          x1 = a.cx;
          y1 = a.bottom;
          x2 = b.cx;
          y2 = b.top;
        } else if (b.bottom <= a.top + gap) {
          // child directly above (rare): vertical connector upwards
          const dy = Math.min(36, Math.max(12, (a.top - b.bottom) / 2));
          d = `M ${a.cx} ${a.top} C ${a.cx} ${a.top - dy}, ${b.cx} ${b.bottom + dy}, ${b.cx} ${b.bottom}`;
          x1 = a.cx;
          y1 = a.top;
          x2 = b.cx;
          y2 = b.bottom;
        } else {
          continue; // fully overlapping, nothing sensible to draw
        }
        out.push({
          id: `${p}>${t.key}`,
          d,
          dlcId: t.dlc,
          target: t.key,
          source: p,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }
    setEdges(out);
  }, []);

  useLayoutEffect(() => {
    const run = () => computeEdges(renderedTechs);
    run();
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(run);
    ro.observe(grid);
    const t = window.setTimeout(run, 500); // re-check after fonts settle
    /*
     * A freshly opened tab can compute edges before the webfonts finish
     * loading; once the real fonts swap in, badge heights shift by a pixel
     * or two — recompute then so both ends stay connected.
     */
    let live = true;
    document.fonts?.ready?.then(() => {
      if (live) run();
    });
    return () => {
      live = false;
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [computeEdges, renderedTechs]);

  /* ---------- highlight tracing (hover wins over spotlight) ---------- */
  const activeKey = hoverKey ?? spotlightKey;
  const nextKeys = useMemo(() => {
    if (!activeKey) return null;
    const s = new Set<string>();
    for (const t of techs) {
      if (t.prereqs.includes(activeKey) && !acquired.has(t.key)) s.add(t.key);
    }
    return s;
  }, [activeKey, techs, acquired]);

  const researched = countTechs.filter((t) => acquired.has(t.key)).length;

  return (
    <section id={id} className="scroll-mt-40">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}88` }}
        />
        <h2
          className="text-base font-semibold uppercase tracking-[0.18em] text-slate-100"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          {title}
        </h2>
        <span className="text-xs text-slate-300">
          {researched}/{countTechs.length} researched
        </span>
        <span className="text-[10.5px] italic text-slate-500">
          rows = categories, left → right = tiers, prerequisites always first
        </span>
        <span
          aria-hidden
          className="h-px min-w-8 flex-1"
          style={{
            background: `linear-gradient(to right, ${accent}40, transparent)`,
          }}
        />
      </header>

      <div className="scroll-slim relative overflow-x-auto px-1 pb-3">
        {/* Lane rows are flex (not grid) so the sticky label is a flex child
            and stays pinned across the full scroll width. */}
        <div
          ref={gridRef}
          className="relative"
          style={{ width: "max-content", minWidth: "100%" }}
        >
          {/* zoom probe: fixed 100px CSS width, measured to detect the tree
              zoom applied to this subtree (see computeEdges) */}
          <span
            ref={probeRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: 100, height: 0, visibility: "hidden" }}
          />
          {/* base connector lines (under the cards) */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
          >
            {edges.map((e) => {
              const connected =
                activeKey != null &&
                (e.source === activeKey || e.target === activeKey);
              if (connected) return null; // drawn on the highlight layer instead
              const color =
                (e.dlcId && DLC_BY_ID.get(e.dlcId)?.color) || "#94a3b8";
              const done =
                acquired.has(e.target) && acquired.has(e.source);
              return (
                <g key={e.id}>
                  <path
                    d={e.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={done ? 1.9 : 1.4}
                    strokeOpacity={
                      activeKey ? 0.05 : done ? 0.62 : 0.3
                    }
                  />
                  <circle
                    cx={e.x2}
                    cy={e.y2}
                    r={2.1}
                    fill={color}
                    fillOpacity={activeKey ? 0.08 : done ? 0.85 : 0.5}
                  />
                </g>
              );
            })}
          </svg>

          {/* highlighted connector lines (over the cards) */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
          >
            <defs>
              <marker
                id={`arrow-next-${id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={TRACE_NEXT_COLOR} />
              </marker>
              <marker
                id={`arrow-in-${id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={TRACE_PREREQ_COLOR} />
              </marker>
            </defs>
            {activeKey != null &&
              edges
                .filter(
                  (e) => e.source === activeKey || e.target === activeKey,
                )
                .map((e) => {
                  const isNext = e.source === activeKey;
                  const color = isNext ? TRACE_NEXT_COLOR : TRACE_PREREQ_COLOR;
                  return (
                    <g key={e.id}>
                      {/* soft glow underlay */}
                      <path
                        d={e.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={8.5}
                        strokeOpacity={0.3}
                        strokeLinecap="round"
                      />
                      {/* animated flowing line */}
                      <path
                        className="edge-flow"
                        d={e.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        markerEnd={`url(#${isNext ? "arrow-next" : "arrow-in"}-${id})`}
                        style={{ filter: `drop-shadow(0 0 4.5px ${color})` }}
                      />
                      {/* origin dot */}
                      <circle
                        cx={e.x1}
                        cy={e.y1}
                        r={3.6}
                        fill={color}
                        fillOpacity={1}
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                      />
                    </g>
                  );
                })}
          </svg>

          {/* header row: sticky corner + tier headers */}
          <div className="flex items-start" style={{ marginBottom: 10 }}>
            <div
              className="sticky left-0 z-40 shrink-0 self-stretch bg-[#070b14]/95 backdrop-blur-sm"
              style={{ width: LABEL_W, marginRight: GAP_X }}
            />
            {TIER_LABELS.map((label, tier) => {
              const inTier = countTechs.filter((t) => columnOf(t) === tier);
              const done = inTier.filter((t) => acquired.has(t.key)).length;
              const complete = inTier.length > 0 && done === inTier.length;
              return (
                <div
                  key={tier}
                  className="flex h-[34px] shrink-0 items-center justify-between rounded-md border px-2.5"
                  style={{
                    width: COL_W,
                    marginRight: tier < 5 ? GAP_X : undefined,
                    borderColor: `${TIER_COLORS[tier]}45`,
                    background: `${TIER_COLORS[tier]}12`,
                    color: TIER_COLORS[tier],
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-widest">
                    {label}
                  </span>
                  <span
                    title={
                      `${done} of ${inTier.length} techs in this column researched` +
                      (tier >= 2
                        ? ` — the tier opens after ${TIER_UNLOCK_COUNT} tier-${tier - 1} techs in this area`
                        : "")
                    }
                    className="text-[10px] font-bold tabular-nums"
                    style={{ color: complete ? "#34d399" : TIER_COLORS[tier] }}
                  >
                    {done}
                    <span className="opacity-55">/{inTier.length}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* category lanes: one flex row per category — the row carries the
              separator border + lane gap so the whole lane (sticky label
              included) reads as one clearly-delimited band */}
          {lanes.map((lane, ri) => (
            <div
              key={lane.cat}
              className="flex items-stretch border-b border-slate-800/40"
              style={{ paddingBottom: LANE_GAP / 2, marginBottom: LANE_GAP / 2 }}
            >
              {/* sticky lane label */}
              <div
                className="sticky left-0 z-40 flex shrink-0 items-center gap-2 bg-[#070b14]/95 py-2 pl-1 pr-2 backdrop-blur-sm"
                style={{ width: LABEL_W, marginRight: GAP_X, minHeight: 44 }}
              >
                <span
                  aria-hidden
                  className="h-6 w-[3px] shrink-0 rounded-full"
                  style={{ background: `${accent}55` }}
                />
                <span className="min-w-0">
                  <span
                    className="block truncate text-[11px] font-semibold uppercase tracking-wide text-slate-200"
                    title={lane.cat}
                  >
                    {lane.cat}
                  </span>
                  <span className="block text-[9.5px] font-medium text-slate-400">
                    {lane.count} techs
                  </span>
                </span>
              </div>

              {/* tier cells for this lane */}
              {lane.cells.map((cell, tier) => {
                const list = renderedCells.get(`${lane.cat}|${tier}`);
                const empty = !list || list.length === 0;
                const cellRows = Math.max(
                  1,
                  Math.ceil((list?.length ?? 0) / CELL_COLS),
                );
                return (
                  <div
                    key={tier}
                    className="grid shrink-0"
                    style={{
                      width: COL_W,
                      marginRight: tier < 5 ? GAP_X : undefined,
                      /* every card is a fixed uniform size — same width in
                         every tier, same gap left/right as top/bottom */
                      gridTemplateColumns: `repeat(${CELL_COLS}, ${CARD_W}px)`,
                      gridTemplateRows: `repeat(${cellRows}, ${CARD_H}px)`,
                      gap: CARD_GAP,
                      /* column-major fill: cards stack top→bottom, then the
                         next column — so a card later in the dependency-
                         ordered list is never to the LEFT of an earlier one */
                      gridAutoFlow: "column",
                      /* the card block sits flush with the cell's left edge
                         and is vertically centered inside the lane, matching
                         the centered category label */
                      alignContent: "center",
                      background:
                        ri % 2 === 1 ? "rgba(148,163,184,0.03)" : undefined,
                      borderRadius: 6,
                      minHeight: empty ? 34 : undefined,
                    }}
                  >
                    {(list ?? []).map((t) => (
                      <TechCard
                        key={t.key}
                        tech={t}
                        acquired={acquired.has(t.key)}
                        permanent={permanentKeys.has(t.key)}
                        highlight={
                          t.key === activeKey
                            ? "self"
                            : nextKeys?.has(t.key)
                              ? "next"
                              : readyKeys.has(t.key)
                                ? "ready"
                                : undefined
                        }
                        odds={oddsMap?.get(t.key) ?? null}
                        showOdds={showOdds}
                        blocked={blockedKeys.has(t.key)}
                        rating={ratingsMap?.get(t.key) ?? null}
                        planned={plannedKeys?.has(t.key) ?? false}
                        isGoal={t.key === goalKey}
                        onSetGoal={onSetGoal}
                        onToggle={onToggle}
                        onHover={onHover}
                        flash={t.key === flashKey}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
