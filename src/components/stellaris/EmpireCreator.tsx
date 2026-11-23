"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ChevronDown,
  Coins,
  Crown,
  FlaskConical,
  Globe2,
  Hammer,
  Handshake,
  Lock,
  Sparkles,
  Swords,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { EmpireCard } from "@/components/stellaris/EmpireCard";
import { EmpireDetail } from "@/components/stellaris/EmpireDetail";
import { TabSearchBar, useTabSearch } from "@/components/stellaris/TabSearch";
import { useStoredSet } from "@/lib/useStoredSet";
import {
  ALL_EXTRA_DLC_IDS,
  AUTHORITIES,
  AXES,
  EMPIRE_EXTRA_DLCS,
  HOMEWORLDS,
  ORIGINS,
  SPECIES_CLASSES,
  SPECIES_CLASS_BY_ID,
  type AxisKey,
  type Authority,
  type GestaltKind,
  type Origin,
  type SpeciesClass,
} from "@/lib/empireData";
import {
  generateEmpires,
  normalizeEmpire,
  originFits,
  type EmpireSeed,
  type GeneratedEmpire,
} from "@/lib/empireGen";
import { BASE_DLC_ID, DLC_LIST } from "@/lib/techtree";

const AXES_ICONS: Record<AxisKey, typeof Users> = {
  research: FlaskConical,
  military: Swords,
  expansion: Globe2,
  economy: Coins,
  diplomacy: Handshake,
  growth: Users,
};

const EMPIRE_COUNT = 10;
const STORAGE_EMPIRES = "stellaris-empires-v1";
/** shared with the My Empire tab — empire-only DLC packs */
export const STORAGE_PACKS = "stellaris-empire-dlc-v1";

/* ------------------------------------------------------------------ */
/* external store (useSyncExternalStore) — hydration-safe localStorage */
/* ------------------------------------------------------------------ */

interface EmpireState {
  empires: GeneratedEmpire[];
  selectedId: string | null;
  playstyles: AxisKey[];
}

const DEFAULT_STATE: EmpireState = { empires: [], selectedId: null, playstyles: [] };

const listeners = new Set<() => void>();
const cache: { raw: string | null | undefined; state: EmpireState } = {
  raw: undefined,
  state: DEFAULT_STATE,
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): EmpireState {
  if (cache.raw === undefined) {
    try {
      cache.raw = localStorage.getItem(STORAGE_EMPIRES);
    } catch {
      cache.raw = null;
    }
    if (cache.raw !== null) {
      try {
        const d = JSON.parse(cache.raw) as Partial<EmpireState>;
        if (d && Array.isArray(d.empires) && d.empires.length > 0) {
          // re-resolve every stored empire against the current dataset —
          // refreshes pick objects, enforces point budgets and auto-checks
          // mandatory civics/traits (also migrates older saves)
          const empires = d.empires
            .map((e) => {
              try {
                return normalizeEmpire(e);
              } catch {
                return null;
              }
            })
            .filter((e): e is GeneratedEmpire => e !== null);
          if (empires.length > 0) {
            cache.state = {
              empires,
              selectedId:
                d.selectedId && empires.some((e) => e.id === d.selectedId)
                  ? d.selectedId
                  : empires[0].id,
              playstyles: Array.isArray(d.playstyles) ? d.playstyles : [],
            };
          }
        }
      } catch {
        /* corrupted — keep default */
      }
    }
  }
  return cache.state;
}

function getServerSnapshot(): EmpireState {
  return DEFAULT_STATE;
}

function setEmpireState(next: EmpireState) {
  cache.state = next;
  cache.raw = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_EMPIRES, cache.raw);
  } catch {
    /* storage full — ignore */
  }
  for (const l of listeners) l();
}

function useEmpireStore(): EmpireState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ */

interface EmpireCreatorProps {
  /** DLC selection shared with the tech tree (14 tech-tree DLC ids) */
  activeDlcs: Set<string>;
  onToggleDlc: (id: string) => void;
  /** send the currently selected empire to the "My Empire" tab */
  onSendToMyEmpire?: (empire: GeneratedEmpire) => void;
}

/* ---- "Build from picks" seed state (empty string = random) ---- */

interface SeedState {
  speciesClass: string;
  authority: string;
  origin: string;
  homeworld: string;
}

const EMPTY_SEED: SeedState = {
  speciesClass: "",
  authority: "",
  origin: "",
  homeworld: "",
};

export function EmpireCreator({ activeDlcs, onToggleDlc, onSendToMyEmpire }: EmpireCreatorProps) {
  /* in-tab search — highlights matching boxes, never hides anything */
  const rootRef = useRef<HTMLElement>(null);
  const { query, setQuery, hits } = useTabSearch(rootRef);

  const state = useEmpireStore();
  const { empires, selectedId, playstyles } = state;
  const playstyleSet = useMemo(() => new Set(playstyles), [playstyles]);

  const [packs, setPacks] = useStoredSet(
    STORAGE_PACKS,
    ALL_EXTRA_DLC_IDS,
    (id) => ALL_EXTRA_DLC_IDS.has(id),
  );
  const [dlcOpen, setDlcOpen] = useState(false);

  /* ---- effective DLC pool ---- */
  const effectiveDlcs = useMemo(
    () => new Set([...activeDlcs, ...packs]),
    [activeDlcs, packs],
  );

  /* ---- generation ---- */
  const runGenerate = useCallback(() => {
    const next = generateEmpires({
      count: EMPIRE_COUNT,
      axes: playstyleSet,
      dlcs: effectiveDlcs,
    });
    setEmpireState({
      empires: next,
      selectedId: next[0]?.id ?? null,
      playstyles,
    });
  }, [playstyleSet, effectiveDlcs, playstyles]);

  /* ---- surprise me: fully random roll — ignores playstyles and locked picks ---- */
  const runSurprise = useCallback(() => {
    const next = generateEmpires({
      count: EMPIRE_COUNT,
      axes: new Set(),
      dlcs: effectiveDlcs,
    });
    setEmpireState({
      empires: next,
      selectedId: next[0]?.id ?? null,
      playstyles,
    });
    toast.success("Surprise! 10 fully random empires", {
      description: "Playstyle filters and locked picks were ignored for this roll.",
    });
  }, [effectiveDlcs, playstyles]);

  /* ---- build-from-picks (seeded generation) ---- */
  const [seed, setSeed] = useState<SeedState>(EMPTY_SEED);

  const seedObj = useMemo<EmpireSeed>(() => {
    const o: EmpireSeed = {};
    if (seed.speciesClass) o.speciesClass = seed.speciesClass;
    if (seed.authority) o.authority = seed.authority;
    if (seed.origin) o.origin = seed.origin;
    if (seed.homeworld) o.homeworld = seed.homeworld;
    return o;
  }, [seed]);
  const hasSeed =
    Boolean(seed.speciesClass) ||
    Boolean(seed.authority) ||
    Boolean(seed.origin) ||
    Boolean(seed.homeworld);

  /**
   * Change one seed box and auto-resolve structural conflicts:
   * Machine species ⇄ Machine Intelligence authority, origin gestalt
   * requirements, Lithoid-requiring origins, origin-forced homeworlds.
   */
  const applySeed = useCallback((patch: Partial<SeedState>) => {
    setSeed((prev) => {
      const next = { ...prev, ...patch };
      const cls = next.speciesClass ? SPECIES_CLASS_BY_ID[next.speciesClass] : null;
      const authOf = (id: string) => AUTHORITIES.find((a) => a.id === id) ?? null;
      const orig = next.origin ? (ORIGINS.find((o) => o.id === next.origin) ?? null) : null;

      // Machine species needs the Machine Intelligence authority — and vice versa
      if (cls?.machine && authOf(next.authority)?.gestalt !== "machine") {
        next.authority = "machine";
      } else if (
        !cls?.machine &&
        cls &&
        authOf(next.authority)?.gestalt === "machine"
      ) {
        next.speciesClass = "machine";
      }

      // origin structural requirements
      if (orig?.req?.gestalt) {
        const g = orig.req.gestalt;
        if (next.speciesClass === "machine" && g !== "machine") {
          next.origin = ""; // a machine species cannot take this origin
        } else {
          if (authOf(next.authority)?.gestalt !== g) {
            next.authority = g === "hive" ? "hive" : "machine";
          }
          if (g === "machine" && next.speciesClass && next.speciesClass !== "machine") {
            next.speciesClass = "machine";
          }
        }
      }
      // origins that require the Lithoid portrait pin the species class
      if (orig?.requiresTraits?.includes("lithoid")) {
        const c = next.speciesClass ? SPECIES_CLASS_BY_ID[next.speciesClass] : null;
        if (!c || c.traitId !== "lithoid") next.speciesClass = "lithoid";
      }
      // origins with a forced homeworld lock that box
      if (orig?.homeworld) next.homeworld = "";
      return next;
    });
  }, []);

  const runSeedGenerate = useCallback(() => {
    if (!hasSeed) return;
    const next = generateEmpires({
      count: EMPIRE_COUNT,
      axes: playstyleSet,
      dlcs: effectiveDlcs,
      seed: seedObj,
    });
    setEmpireState({
      empires: next,
      selectedId: next[0]?.id ?? null,
      playstyles,
    });
  }, [hasSeed, seedObj, playstyleSet, effectiveDlcs, playstyles]);

  /* ---- auto-generate on first visit (effect runs client-side only) ---- */
  useEffect(() => {
    if (empires.length === 0) runGenerate();
  }, [empires.length, runGenerate]);

  const rerollOne = useCallback(
    (id: string) => {
      const idx = empires.findIndex((e) => e.id === id);
      if (idx < 0) return;
      // keep honoring the seed picks while they are set — a reroll stays inside them
      const [replacement] = generateEmpires({
        count: 1,
        axes: playstyleSet,
        dlcs: effectiveDlcs,
        ...(hasSeed ? { seed: seedObj } : {}),
      });
      const nextEmpires = [...empires];
      nextEmpires[idx] = replacement;
      setEmpireState({
        empires: nextEmpires,
        selectedId: replacement.id,
        playstyles,
      });
    },
    [empires, playstyleSet, effectiveDlcs, playstyles, hasSeed, seedObj],
  );

  const togglePlaystyle = useCallback(
    (key: AxisKey) => {
      const next = new Set(playstyleSet);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setEmpireState({ empires, selectedId, playstyles: [...next] });
    },
    [empires, selectedId, playstyleSet],
  );

  const selectEmpire = useCallback(
    (id: string) => {
      setEmpireState({ empires, selectedId: id, playstyles });
    },
    [empires, selectedId, playstyles],
  );

  /* ---- manual editing: apply an edited empire in place ---- */
  const updateEmpire = useCallback(
    (next: GeneratedEmpire) => {
      setEmpireState({
        empires: empires.map((e) => (e.id === next.id ? next : e)),
        selectedId: next.id,
        playstyles,
      });
    },
    [empires, playstyles],
  );

  const togglePack = useCallback(
    (id: string) => {
      const next = new Set(packs);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setPacks(next);
    },
    [packs, setPacks],
  );

  const treeDlcs = useMemo(
    () => DLC_LIST.filter((d) => d.id !== BASE_DLC_ID),
    [],
  );

  const selected = empires.find((e) => e.id === selectedId) ?? empires[0] ?? null;
  const activeEmpireDlcs = effectiveDlcs.size;

  /* ---- seed option pools + cross-field compatibility ---- */

  const seedDlcOk = (d: string | null) => !d || effectiveDlcs.has(d);
  const seedCls = seed.speciesClass ? SPECIES_CLASS_BY_ID[seed.speciesClass] ?? null : null;
  const seedAuth = seed.authority
    ? (AUTHORITIES.find((a) => a.id === seed.authority) ?? null)
    : null;
  const seedOrig = seed.origin ? (ORIGINS.find((o) => o.id === seed.origin) ?? null) : null;
  const forcedHomeworld = seedOrig?.homeworld ?? null;
  const forcedHomeworldName = seedOrig?.name ?? "";

  const speciesOptions = SPECIES_CLASSES.filter((c) => c.id === seed.speciesClass || seedDlcOk(c.dlc));
  const authorityOptions = AUTHORITIES.filter((a) => a.id === seed.authority || seedDlcOk(a.dlc));
  const originOptions = ORIGINS.filter((o) => o.id === seed.origin || seedDlcOk(o.dlc));

  const machineImplied =
    seedAuth?.gestalt === "machine" || seedOrig?.req?.gestalt === "machine";
  const hiveOrigin = seedOrig?.req?.gestalt === "hive";
  const lithoidOrigin = seedOrig?.requiresTraits?.includes("lithoid") ?? false;

  const classSelectable = (c: SpeciesClass) => {
    if (c.id === seed.speciesClass) return true;
    if (c.machine) return !hiveOrigin; // a hive origin can never host machines
    if (machineImplied) return false; // machine authority/origin → Machine species only
    if (lithoidOrigin && c.traitId !== "lithoid") return false;
    return true;
  };

  const authoritySelectable = (a: Authority) => {
    if (a.id === seed.authority) return true;
    if (seedCls?.machine) return a.gestalt === "machine";
    if (seedCls && a.gestalt === "machine") return false; // organic class → no machine authority
    if (seedOrig?.req?.gestalt) return a.gestalt === seedOrig.req.gestalt;
    return true;
  };
  const authorityBlockReason = (a: Authority) =>
    seedCls?.machine
      ? "Machine species"
      : seedCls && a.gestalt === "machine"
        ? "needs the Machine species"
        : seedOrig?.req?.gestalt
          ? `needs ${seedOrig.req.gestalt === "hive" ? "Hive Mind" : "Machine Intelligence"}`
          : "unavailable";

  let originGestalt: GestaltKind | null = null;
  if (seedAuth) originGestalt = seedAuth.gestalt;
  else if (seedCls?.machine) originGestalt = "machine";
  else if (seedOrig?.req?.gestalt) originGestalt = seedOrig.req.gestalt;
  const originClassArg = seedCls?.id ?? (originGestalt === "machine" ? "machine" : undefined);
  const originSelectable = (o: Origin) =>
    o.id === seed.origin || originFits(o, originGestalt, originClassArg);
  const originBlockReason = (o: Origin) =>
    o.req?.gestalt === "hive"
      ? "needs Hive Mind"
      : o.req?.gestalt === "machine"
        ? "needs Machine Intelligence"
        : o.req?.notGestalt
          ? "non-gestalt only"
          : o.requiresTraits?.includes("lithoid")
            ? "needs Lithoid species"
            : "unavailable";

  return (
    <section id="empire-creator" ref={rootRef} className="scroll-mt-40">
      {/* ---------- header ---------- */}
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-400/10"
        >
          <Crown className="h-5 w-5 text-rose-300" />
        </span>
        <h2
          className="text-base font-semibold uppercase tracking-[0.18em] text-slate-50"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Empire Creator
        </h2>
        <span className="text-xs text-slate-300">
          Random empire generator · synced with your tech tree DLCs
        </span>
        <span
          aria-hidden
          className="h-px min-w-8 flex-1"
          style={{ background: "linear-gradient(to right, #fb718566, transparent)" }}
        />
        {/* search bar — right upper corner of the tab */}
        <TabSearchBar
          query={query}
          onQueryChange={setQuery}
          hits={hits}
          accent="rose"
          rootRef={rootRef}
          placeholder="Search Empire Creator…"
        />
      </header>

      {/* ---------- controls ---------- */}
      <div data-search-box className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3.5">
        {/* DLC panel — above the playstyle picks */}
        <button
          type="button"
          onClick={() => setDlcOpen((o) => !o)}
          aria-expanded={dlcOpen}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-[11.5px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${dlcOpen ? "rotate-180" : ""}`}
          />
          Empire DLC
          <span className="text-[10px] font-semibold opacity-80">
            {activeEmpireDlcs}/{treeDlcs.length + EMPIRE_EXTRA_DLCS.length}
          </span>
        </button>

        {dlcOpen && (
          <div data-search-box className="mt-2.5 grid gap-4 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 lg:grid-cols-2">
            {/* group 1: shared tech tree DLCs */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Tech Tree DLCs{" "}
                <span className="font-medium normal-case tracking-normal text-amber-300/90">
                  · shared with the tree
                </span>
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {treeDlcs.map((d) => {
                  const on = activeDlcs.has(d.id);
                  return (
                    <DlcToggle
                      key={d.id}
                      name={d.name}
                      color={d.color}
                      on={on}
                      onToggle={() => onToggleDlc(d.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* group 2: empire-only extras */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Empire Packs{" "}
                <span className="font-medium normal-case tracking-normal text-rose-300/90">
                  · not in the tech tree
                </span>
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {EMPIRE_EXTRA_DLCS.map((d) => {
                  const on = packs.has(d.id);
                  return (
                    <DlcToggle
                      key={d.id}
                      name={d.name}
                      color={d.color}
                      on={on}
                      onToggle={() => togglePack(d.id)}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] italic text-slate-400">
                Utopia unlocks Hive Minds, Synthetic Dawn unlocks Machine
                Intelligences, species packs add traits, civics and origins.
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
            Playstyles
          </p>
          <span className="text-[10.5px] italic text-slate-400">
            leave all off for anything
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {AXES.map((a) => {
            const on = playstyleSet.has(a.key);
            const Icon = AXES_ICONS[a.key];
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => togglePlaystyle(a.key)}
                aria-pressed={on}
                title={a.desc}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  on
                    ? ""
                    : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500 hover:text-white",
                ].join(" ")}
                style={
                  on
                    ? {
                        borderColor: `${a.color}88`,
                        background: `${a.color}1c`,
                        color: a.color,
                      }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={runSurprise}
              data-surprise-button
              title="Ignore playstyles and locked picks — 10 completely random empires"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-400/50 bg-violet-400/10 px-4 text-[13px] font-bold text-violet-200 transition-all hover:border-violet-300 hover:bg-violet-400/20 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              Surprise Me
            </button>
            <button
              type="button"
              onClick={runGenerate}
              data-generate-button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-5 text-[13px] font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-400 hover:to-pink-400 hover:shadow-rose-400/30"
            >
              <Wand2 className="h-4 w-4" />
              Generate 10 Empires
            </button>
          </div>
        </div>

        {/* ---- build from picks (seeded generation) ---- */}
        <div className="mt-3 border-t border-slate-800/80 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              Build from picks
            </p>
            <span className="text-[10.5px] italic text-slate-400">
              lock what you care about — every box left on Random gets rolled
            </span>
            {hasSeed && (
              <button
                type="button"
                onClick={() => setSeed(EMPTY_SEED)}
                className="ml-auto rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
              >
                Clear picks
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <SeedSelect
              label="Species"
              value={seed.speciesClass}
              onChange={(v) => applySeed({ speciesClass: v })}
            >
              <option value="">— Random —</option>
              {speciesOptions.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={!classSelectable(c)}
                  className={c.machine ? "font-semibold" : ""}
                >
                  {c.name}
                  {c.machine ? " — Machine Intelligence" : ""}
                  {!classSelectable(c) && c.machine ? " (not with a Hive origin)" : ""}
                </option>
              ))}
            </SeedSelect>

            <SeedSelect
              label="Authority"
              value={seed.authority}
              onChange={(v) => applySeed({ authority: v })}
            >
              <option value="">— Random —</option>
              {authorityOptions.map((a) => (
                <option key={a.id} value={a.id} disabled={!authoritySelectable(a)}>
                  {a.name}
                  {!authoritySelectable(a) ? ` (${authorityBlockReason(a)})` : ""}
                </option>
              ))}
            </SeedSelect>

            <SeedSelect
              label="Origin"
              value={seed.origin}
              onChange={(v) => applySeed({ origin: v })}
            >
              <option value="">— Random —</option>
              {originOptions.map((o) => (
                <option key={o.id} value={o.id} disabled={!originSelectable(o)}>
                  {o.name}
                  {!originSelectable(o) ? ` (${originBlockReason(o)})` : ""}
                </option>
              ))}
            </SeedSelect>

            {forcedHomeworld ? (
              <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1 sm:max-w-[11rem]">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400">
                  Homeworld
                </span>
                <span
                  title={`Forced by the ${forcedHomeworldName} origin`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 text-[11.5px] font-semibold text-emerald-200"
                >
                  <Lock className="h-3 w-3 shrink-0" aria-hidden />
                  {forcedHomeworld}
                </span>
              </label>
            ) : (
              <SeedSelect
                label="Homeworld"
                value={seed.homeworld}
                onChange={(v) => applySeed({ homeworld: v })}
              >
                <option value="">— Random —</option>
                {HOMEWORLDS.map((h) => (
                  <option key={h} value={h}>
                    {h} World
                  </option>
                ))}
              </SeedSelect>
            )}

            <button
              type="button"
              onClick={runSeedGenerate}
              disabled={!hasSeed}
              data-seed-generate-button
              title={
                hasSeed
                  ? "Generate 10 empires from your locked picks"
                  : "Pick at least one of Species / Authority / Origin / Homeworld first"
              }
              className={[
                "ml-auto inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-bold transition-all",
                hasSeed
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-400/30"
                  : "cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500",
              ].join(" ")}
            >
              <Hammer className="h-4 w-4" />
              Build 10 Empires
            </button>
          </div>

          <p className="mt-2 text-[10.5px] italic leading-relaxed text-slate-400">
            {hasSeed
              ? "Building with your locked picks — traits, ethics, civics and names stay random."
              : "Leave a box on Random and the generator fills it for you — but pick at least one to enable the button."}
          </p>
        </div>
      </div>

      {/* ---------- results ---------- */}
      {selected && (
        <div className="mt-5">
          <EmpireDetail
            empire={selected}
            onChange={updateEmpire}
            onReroll={() => rerollOne(selected.id)}
            onSend={
              onSendToMyEmpire ? () => onSendToMyEmpire(selected) : undefined
            }
            dlcs={effectiveDlcs}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {empires.map((e, i) => (
          <EmpireCard
            key={e.id}
            empire={e}
            index={i}
            selected={selected?.id === e.id}
            onSelect={() => selectEmpire(e.id)}
            onReroll={() => rerollOne(e.id)}
          />
        ))}
      </div>

    </section>
  );
}

/* ------------------------------------------------------------------ */

function SeedSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1 sm:max-w-[13rem]">
      <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} pick`}
        className="h-8 w-full rounded-md border border-slate-700 bg-slate-900/70 px-1.5 text-[11.5px] font-medium text-slate-100 focus:border-amber-400/60 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function DlcToggle({
  name,
  color,
  on,
  onToggle,
}: {
  name: string;
  color: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={[
        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
        on
          ? "border-slate-600 bg-slate-900/80"
          : "border-slate-800/60 bg-slate-950/40 opacity-55 hover:opacity-90",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
        style={{ background: color }}
      />
      <span
        className={[
          "truncate text-[11px] font-medium",
          on ? "text-slate-100" : "text-slate-300",
        ].join(" ")}
      >
        {name}
      </span>
    </button>
  );
}
