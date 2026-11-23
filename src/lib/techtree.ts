import raw from "@/data/techtree.json";

export type Area = "physics" | "society" | "engineering";
export type TabId = "all" | Area | "events" | "myempire" | "empire" | "ships";
export type Rarity = 0 | 1 | 2;

export interface Tech {
  key: string;
  name: string;
  desc: string;
  area: Area;
  cat: string;
  tier: number;
  cost: number;
  weight: number;
  rarity: Rarity;
  dangerous: boolean;
  startTech: boolean;
  prereqs: string[];
  dlc: string | null;
  unlocks: string[];
  event: boolean;
}

export interface DlcInfo {
  id: string;
  name: string;
  short: string;
  color: string;
}

export const GAME_VERSION: string = raw.version;
export const DLC_LIST: DlcInfo[] = raw.dlcs;
export const DLC_BY_ID: Map<string, DlcInfo> = new Map(
  DLC_LIST.map((d) => [d.id, d]),
);
export const BASE_DLC_ID = "base";

/** DLCs shown in the filter bar — the base game is always active and never listed. */
export const DLC_FILTER_LIST: DlcInfo[] = DLC_LIST.filter(
  (d) => d.id !== BASE_DLC_ID,
);

export const TECHS: Tech[] = raw.techs.map((t) => ({
  key: t.k,
  name: t.n,
  desc: t.d,
  area: t.a as Area,
  cat: t.c,
  tier: t.t,
  cost: t.cost,
  weight: t.w,
  rarity: t.r as Rarity,
  dangerous: t.dg,
  startTech: t.st,
  prereqs: t.p,
  dlc: t.dlc,
  unlocks: t.u,
  event: t.e,
}));

export const TECH_BY_KEY: Map<string, Tech> = new Map(
  TECHS.map((t) => [t.key, t]),
);

/**
 * Starting techs that are flagged `is_start_tech` in the game files but are
 * only starting techs for certain empire types — every empire else has to
 * research them normally (or can never get them at all).
 *
 * Verified against the Stellaris wiki / Voidpedia (4.5):
 *   tech_weavers, tech_maulers, tech_weaver_bio_anti_evasion_1,
 *   tech_weaver_bio_evasion_1 — "Bio-ship empire" (BioGenesis biological
 *     ship set)
 *   tech_hive_node (Synaptic Structures) — Hive Mind authority only
 *   tech_wilderness_node (Centers of Being), tech_wilderness_terraform
 *     (Planetary Germination) — Wilderness origin only
 *   tech_critter_feeder (Fruit Gardens) — Fruitful Partnership origin only
 *   tech_subspace_drive (Subspace Drive) — granted at start by the Eager
 *     Explorers civic (not modeled here), researchable by everyone else
 */
export const CONDITIONAL_START_TECH_KEYS: ReadonlySet<string> = new Set([
  "tech_weavers",
  "tech_maulers",
  "tech_weaver_bio_anti_evasion_1",
  "tech_weaver_bio_evasion_1",
  "tech_hive_node",
  "tech_wilderness_node",
  "tech_wilderness_terraform",
  "tech_critter_feeder",
  "tech_subspace_drive",
]);

/**
 * Technologies known to EVERY empire from day one — the starting techs that
 * are not empire-conditional (Corvettes, Hydroponics Farming, Planetary
 * Government, …) plus Bio-Reactor. They are permanently researched:
 * force-added on every page load and impossible to un-research.
 *
 * The empire-conditional starting techs above are handled separately in
 * `myEmpire.ts` — they only become permanent when the matching setting is
 * applied in the "My Empire" tab.
 */
export const UNIVERSAL_START_TECH_KEYS: ReadonlySet<string> = new Set([
  ...TECHS.filter((t) => t.startTech && !CONDITIONAL_START_TECH_KEYS.has(t.key)).map(
    (t) => t.key,
  ),
  "tech_bio_reactor",
]);

export const AREA_META: Record<Area, { label: string; color: string; bg: string }> = {
  physics: { label: "Physics", color: "#38bdf8", bg: "#1b4a72" },
  society: { label: "Society", color: "#4ade80", bg: "#175434" },
  engineering: { label: "Engineering", color: "#facc15", bg: "#66551a" },
};

/** Saturated-but-muted card background for event technologies (purple). */
export const EVENT_BG = "#3c2263";

/** Card background color for a tech: its area color, or purple for events. */
export function bgOf(tech: Tech): string {
  return tech.event ? EVENT_BG : AREA_META[tech.area].bg;
}

export const TAB_META: { id: TabId; label: string; color: string }[] = [
  { id: "all", label: "All", color: "#e2e8f0" },
  { id: "physics", label: "Physics", color: AREA_META.physics.color },
  { id: "society", label: "Society", color: AREA_META.society.color },
  { id: "engineering", label: "Engineering", color: AREA_META.engineering.color },
  { id: "events", label: "Events", color: "#c084fc" },
  { id: "myempire", label: "My Empire", color: "#fbbf24" },
  { id: "ships", label: "Ships", color: "#3b82f6" },
  { id: "empire", label: "Empire Creator", color: "#fb7185" },
];

export const TIER_LABELS = [
  "Starting",
  "Tier 1",
  "Tier 2",
  "Tier 3",
  "Tier 4",
  "Tier 5",
];

/**
 * Per-tier accent color, white → gold as tiers advance.
 * Index 0 (Starting) stays neutral gray since it sits outside the tier ladder.
 */
export const TIER_COLORS = [
  "#94a3b8", // Starting — neutral slate
  "#f1f5f9", // T1 — white
  "#fef3c7", // T2 — champagne
  "#fcd34d", // T3 — soft gold
  "#f59e0b", // T4 — gold
  "#d97706", // T5 — deep gold
] as const;

/** Saturated connector-highlight colors: gold = what the tech unlocks next, cyan = its prerequisites. */
export const TRACE_NEXT_COLOR = "#fde047";
export const TRACE_PREREQ_COLOR = "#22d3ee";

/**
 * Visual column (0–5) a tech is laid out in. Normally its own tier, but the
 * game data has a few techs whose prerequisite sits in a LATER tier (e.g.
 * tier-1 "Advanced Reactor Boosters" requires tier-3 "Antimatter Power").
 * Those techs are pulled into their highest prerequisite's column so a
 * prerequisite is never rendered to the right of the tech that needs it —
 * the tree always reads left → right along dependency chains.
 */
const COLUMN_MAP: Map<string, number> = (() => {
  const col = new Map<string, number>();
  const resolve = (t: Tech, seen: Set<string>): number => {
    const hit = col.get(t.key);
    if (hit != null) return hit;
    if (seen.has(t.key)) return t.tier; // cycle guard (data is a DAG)
    seen.add(t.key);
    let v = t.tier;
    for (const p of t.prereqs) {
      const pt = TECH_BY_KEY.get(p);
      if (pt) v = Math.max(v, resolve(pt, seen));
    }
    seen.delete(t.key);
    col.set(t.key, v);
    return v;
  };
  for (const t of TECHS) resolve(t, new Set());
  return col;
})();

/** Column of the tier grid this tech is rendered in (>= its real tier). */
export function columnOf(t: Tech): number {
  return COLUMN_MAP.get(t.key) ?? t.tier;
}

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; tint: string }
> = {
  0: { label: "Common", color: "#94a3b8", tint: "rgba(148,163,184,0.05)" },
  1: { label: "Rare", color: "#f6c453", tint: "rgba(246,196,83,0.12)" },
  2: { label: "Unique", color: "#c084fc", tint: "rgba(192,132,252,0.14)" },
};

export const STORAGE_KEYS = {
  progress: "stellaris-progress-v1",
  dlcFilter: "stellaris-dlc-filter-v1",
};

/** Stable category order per section id (area or "events"), by total tech count. */
export const CATEGORY_ORDER: Record<string, string[]> = (() => {
  const counts = new Map<string, Map<string, number>>();
  const bump = (section: string, cat: string) => {
    if (!counts.has(section)) counts.set(section, new Map());
    const m = counts.get(section)!;
    m.set(cat, (m.get(cat) ?? 0) + 1);
  };
  for (const t of TECHS) {
    bump(t.event ? "events" : t.area, t.cat);
  }
  const out: Record<string, string[]> = {};
  for (const [section, m] of counts) {
    out[section] = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }
  return out;
})();

export function dlcOf(t: Tech): DlcInfo {
  return (t.dlc && DLC_BY_ID.get(t.dlc)) || DLC_BY_ID.get(BASE_DLC_ID)!;
}

/** stable helpers for useStoredSet */
export const EMPTY_SET = new Set<string>();
export const ALL_DLC_IDS = new Set<string>(DLC_LIST.map((d) => d.id));
/** default filter state: every real DLC enabled (base game is implicit) */
export const ALL_DLC_FILTER_IDS = new Set<string>(
  DLC_FILTER_LIST.map((d) => d.id),
);
export const isValidTechKey = (k: string): boolean => TECH_BY_KEY.has(k);
export const isValidDlcId = (k: string): boolean => DLC_BY_ID.has(k);

export function prereqTechs(t: Tech): Tech[] {
  return t.prereqs
    .map((p) => TECH_BY_KEY.get(p))
    .filter((x): x is Tech => Boolean(x));
}

export function techsOfTab(tab: TabId): Tech[] {
  if (tab === "events") return TECHS.filter((t) => t.event);
  return TECHS.filter((t) => !t.event && (tab === "all" || t.area === tab));
}

/** tabs that are tools rather than tech-tree views */
export const TOOL_TABS: ReadonlySet<TabId> = new Set(["empire", "myempire", "ships"]);

export interface SaveFile {
  app: string;
  version: string;
  savedAt: string;
  name: string;
  acquired: string[];
}

export function buildSaveFile(name: string, acquired: Set<string>): SaveFile {
  return {
    app: "stellaris-tech-tree",
    version: GAME_VERSION,
    savedAt: new Date().toISOString(),
    name,
    acquired: [...acquired].sort(),
  };
}

export function parseSaveFile(text: string): { acquired: string[]; name?: string } {
  const data: unknown = JSON.parse(text);
  let keys: unknown = null;
  let name: string | undefined;
  if (Array.isArray(data)) {
    keys = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.acquired)) {
      keys = obj.acquired;
      if (typeof obj.name === "string") name = obj.name;
    }
  }
  if (!Array.isArray(keys)) throw new Error("No acquired list found in file");
  const valid = keys.filter(
    (k): k is string => typeof k === "string" && TECH_BY_KEY.has(k),
  );
  return { acquired: [...new Set(valid)], name };
}
