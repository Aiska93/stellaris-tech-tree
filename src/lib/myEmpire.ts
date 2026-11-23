/**
 * "My Empire" — empire settings applied to the tech tree.
 *
 * The user picks an empire (or sends one over from the Empire Creator); the
 * config is persisted and used to
 *   1. LOCK technologies that this empire type can never research, and
 *   2. modify research draw weights (appearance odds) shown on the cards.
 *
 * Base tech weights are real game data (v4.3.7). Empire effects are a curated
 * approximation of the in-game weight factors, verified against the Stellaris
 * wiki (4.5 tables) where possible.
 *
 * Requirement locks (psionics, Machine Intelligence techs, the biological
 * ship line, …) apply even when NO empire is applied — they are then checked
 * against a generic organic empire, so requirement-gated cards stay grayed
 * out until the matching settings are chosen in the "My Empire" tab.
 */

import { useSyncExternalStore } from "react";
import {
  TECHS,
  UNIVERSAL_START_TECH_KEYS,
  type Area,
  type Tech,
} from "@/lib/techtree";
import {
  AUTHORITIES,
  CIVICS,
  ETHICS,
  HOMEWORLDS,
  ORIGINS,
  SPECIES_CLASS_BY_ID,
  TRAITS,
} from "@/lib/empireData";
import {
  ASCENSION_PERKS,
  DEFAULT_POLICIES,
  GALACTIC_WONDERS_TECH_KEYS,
  SUBTERFUGE_TECH_KEYS,
  TERRAFORM_TECH_KEYS,
  TRADITION_TREES,
  type PolicyConfig,
} from "@/lib/empireExtras";
import type { GeneratedEmpire } from "@/lib/empireGen";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

/** Plain-id empire description — JSON-serializable, independent of the generator */
export interface MyEmpireConfig {
  name: string;
  /** AUTHORITIES id */
  authority: string;
  /** ETHICS ids, e.g. ["militarist", "spiritualist_f"] */
  ethics: string[];
  /** CIVICS ids */
  civics: string[];
  /** ORIGINS id */
  origin: string;
  /** SPECIES_CLASSES id */
  speciesClass: string;
  /** TRAITS ids (class traits included) */
  traits: string[];
  homeworld: string;
  /** BioGenesis biological ship set — makes the weaver-line techs starting techs */
  bioShip: boolean;
  /** finished tradition tree ids (max 7) */
  traditions: string[];
  /** active policies (war doctrine, research focus, restrictions, defense) */
  policies: PolicyConfig;
  /** ascension perk ids (slots = finished trees + Ascension Theory, max 8) */
  perks: string[];
}

export const STORAGE_MY_EMPIRE = "stellaris-my-empire-v1";

/* ------------------------------------------------------------------ */
/* Persisted store (submitted config) — useSyncExternalStore pattern   */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();
const cache: { raw: string | null | undefined; value: MyEmpireConfig | null } = {
  raw: undefined,
  value: null,
};

function readConfig(raw: string | null): MyEmpireConfig | null {
  if (raw === null) return null;
  try {
    const d = JSON.parse(raw) as Partial<MyEmpireConfig> | null;
    if (!d || typeof d !== "object") return null;
    if (typeof d.authority !== "string") return null;
    return {
      name: typeof d.name === "string" ? d.name : "My Empire",
      authority: d.authority,
      ethics: Array.isArray(d.ethics) ? d.ethics.filter((x) => typeof x === "string") : [],
      civics: Array.isArray(d.civics) ? d.civics.filter((x) => typeof x === "string") : [],
      origin: typeof d.origin === "string" ? d.origin : "prosperous_unification",
      speciesClass: typeof d.speciesClass === "string" ? d.speciesClass : "humanoid",
      traits: Array.isArray(d.traits) ? d.traits.filter((x) => typeof x === "string") : [],
      homeworld: typeof d.homeworld === "string" ? d.homeworld : "Continental",
      bioShip: d.bioShip === true,
      traditions: Array.isArray(d.traditions)
        ? d.traditions.filter((x) => typeof x === "string")
        : [],
      policies: {
        ...DEFAULT_POLICIES,
        ...(d.policies && typeof d.policies === "object"
          ? (d.policies as Partial<PolicyConfig>)
          : {}),
        researchFocus: {
          ...DEFAULT_POLICIES.researchFocus,
          ...(d.policies?.researchFocus ?? {}),
        },
      },
      perks: Array.isArray(d.perks) ? d.perks.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return null;
  }
}

function getSnapshot(): MyEmpireConfig | null {
  if (cache.raw === undefined) {
    try {
      cache.raw = localStorage.getItem(STORAGE_MY_EMPIRE);
    } catch {
      cache.raw = null;
    }
    if (cache.raw !== null) cache.value = readConfig(cache.raw);
  }
  return cache.value;
}

function getServerSnapshot(): MyEmpireConfig | null {
  return null;
}

function setMyEmpire(next: MyEmpireConfig | null) {
  cache.value = next;
  cache.raw = next === null ? "null" : JSON.stringify(next);
  try {
    if (next === null) localStorage.removeItem(STORAGE_MY_EMPIRE);
    else localStorage.setItem(STORAGE_MY_EMPIRE, cache.raw);
  } catch {
    /* storage unavailable — keep in-memory */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** hook: the submitted (applied-to-tree) empire config */
export function useMyEmpireStore(): [
  MyEmpireConfig | null,
  (next: MyEmpireConfig | null) => void,
] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, setMyEmpire];
}

/** direct (non-hook) access for event handlers */
export const getMyEmpire = getSnapshot;
export const applyMyEmpire = setMyEmpire;

/* ------------------------------------------------------------------ */
/* Bridge: GeneratedEmpire (Empire Creator) ⇄ MyEmpireConfig           */
/* ------------------------------------------------------------------ */

export function configFromEmpire(e: GeneratedEmpire): MyEmpireConfig {
  return {
    name: e.name,
    authority: e.authority.id,
    ethics: e.ethics.map((x) => x.id),
    civics: e.civics.map((x) => x.id),
    origin: e.origin.id,
    speciesClass: e.speciesClass,
    traits: e.traits.map((x) => x.id),
    homeworld: e.homeworld,
    // the Empire Creator does not model ship sets — start from "off"
    bioShip: false,
    traditions: [],
    policies: { ...DEFAULT_POLICIES, researchFocus: { ...DEFAULT_POLICIES.researchFocus } },
    perks: [],
  };
}

/** Build a minimal pseudo-empire so the generator's change* helpers can edit it. */
export function pseudoEmpireFromConfig(config: MyEmpireConfig | null): GeneratedEmpire {
  const authority =
    AUTHORITIES.find((a) => a.id === config?.authority) ?? AUTHORITIES[0];
  const origin =
    ORIGINS.find((o) => o.id === config?.origin) ?? ORIGINS[0];
  const cls = config?.speciesClass && SPECIES_CLASS_BY_ID[config.speciesClass]
    ? config.speciesClass
    : "humanoid";
  const findCivics = (ids: string[]) =>
    ids.map((id) => CIVICS.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  return {
    id: "my-empire",
    name: config?.name ?? "My Empire",
    species: config?.name ? config.name.split(" ")[0] : "Custom",
    speciesAdj: "Custom",
    speciesClass: cls,
    archetype: "research",
    ratings: { research: 0, military: 0, expansion: 0, economy: 0, diplomacy: 0, growth: 0 },
    rawRatings: { research: 0, military: 0, expansion: 0, economy: 0, diplomacy: 0, growth: 0 },
    ethics: (config?.ethics ?? [])
      .map((id) => ETHICS.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    authority,
    civics: findCivics(config?.civics ?? []),
    origin,
    traits: (config?.traits ?? [])
      .map((id) => TRAITS.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    homeworld:
      // origin-forced homeworlds (Relic World, Gaia World, …) are preserved
      // through the origin itself; free-choice ones must be valid
      origin.homeworld ??
      (config?.homeworld && (HOMEWORLDS as readonly string[]).includes(config.homeworld)
        ? config.homeworld
        : "Continental"),
    summary: "",
    modifiers: [],
  };
}

/* ------------------------------------------------------------------ */
/* Derived facts — everything the lock/weight rules need               */
/* ------------------------------------------------------------------ */

export interface EmpireFacts {
  gestalt: "hive" | "machine" | null;
  corporate: boolean;
  machineSpecies: boolean;
  lithoid: boolean;
  /** BioGenesis biological ship set ("bio-ship empire") */
  bioShip: boolean;
  /** ethic level per axis: 0 none, 1 regular, 2 fanatic */
  ethics: Record<string, number>;
  civics: Set<string>;
  origin: string;
  traits: Set<string>;
  /** research alternatives per draw (Technocracy +1, Discovery +1) */
  alternatives: number;
  /** finished tradition trees */
  trees: ReadonlySet<string>;
  /** active policies */
  policies: PolicyConfig;
  /** ascension perks */
  perks: ReadonlySet<string>;
}

export function factsFromConfig(config: MyEmpireConfig): EmpireFacts {
  const authority = AUTHORITIES.find((a) => a.id === config.authority);
  const ethics: Record<string, number> = {};
  for (const id of config.ethics) {
    const e = ETHICS.find((x) => x.id === id);
    if (!e) continue;
    ethics[e.axis] = e.fanatic ? 2 : Math.max(ethics[e.axis] ?? 0, 1);
  }
  const traits = new Set(config.traits);
  const civics = new Set(config.civics);
  const trees = new Set(config.traditions);
  const perks = new Set(config.perks);
  return {
    gestalt: authority?.gestalt ?? null,
    corporate: authority?.corporate ?? false,
    machineSpecies:
      traits.has("mechanical") ||
      config.speciesClass === "machine" ||
      authority?.gestalt === "machine",
    lithoid: traits.has("lithoid") || config.speciesClass === "lithoid",
    bioShip: config.bioShip,
    ethics,
    civics,
    origin: config.origin,
    traits,
    // Technocracy civic +1, Discovery tradition (Science Division) +1
    alternatives: 3 + (civics.has("technocracy") ? 1 : 0) + (trees.has("discovery") ? 1 : 0),
    trees,
    policies: {
      ...DEFAULT_POLICIES,
      ...config.policies,
      researchFocus: { ...DEFAULT_POLICIES.researchFocus, ...config.policies.researchFocus },
    },
    perks,
  };
}

/* ------------------------------------------------------------------ */
/* Empire-conditional starting techs                                   */
/* ------------------------------------------------------------------ */

/**
 * Starting techs that only some empire types know from day one. A tech is
 * permanently researched (locked in as "known at start") exactly when the
 * matching setting is applied in the "My Empire" tab; for every other empire
 * it is a normal, freely researchable technology.
 */
export interface ConditionalStartRule {
  keys: string[];
  /** human-readable setting that grants these techs at start */
  setting: string;
  /** short note shown on the padlock tooltip */
  note: string;
  matches: (facts: EmpireFacts) => boolean;
}

export const CONDITIONAL_START_RULES: ConditionalStartRule[] = [
  {
    keys: [
      "tech_weavers",
      "tech_maulers",
      "tech_weaver_bio_anti_evasion_1",
      "tech_weaver_bio_evasion_1",
    ],
    setting: "Biological ship set (BioGenesis)",
    note: "your empire flies living ships",
    // Machine Intelligences can never use the biological ship set
    matches: (f) => f.bioShip && f.gestalt !== "machine",
  },
  {
    keys: ["tech_hive_node"],
    setting: "Hive Mind authority",
    note: "Hive Mind empires start with it",
    matches: (f) => f.gestalt === "hive",
  },
  {
    keys: ["tech_wilderness_node", "tech_wilderness_terraform"],
    setting: "Wilderness origin",
    note: "the Wilderness origin starts with it",
    matches: (f) => f.origin === "wilderness",
  },
  {
    keys: ["tech_critter_feeder"],
    setting: "Fruitful Partnership origin",
    note: "the Fruitful Partnership origin starts with it",
    matches: (f) => f.origin === "fruitful_partnership",
  },
];

/**
 * Every technology this empire permanently knows from day one: the universal
 * starting techs plus the conditional ones whose setting is applied. With no
 * empire applied, only the universal set is permanent.
 */
export function permanentStartKeys(
  facts: EmpireFacts | null,
): ReadonlySet<string> {
  if (!facts) return UNIVERSAL_START_TECH_KEYS;
  const out = new Set<string>(UNIVERSAL_START_TECH_KEYS);
  for (const rule of CONDITIONAL_START_RULES) {
    if (rule.matches(facts)) for (const k of rule.keys) out.add(k);
  }
  return out;
}

/** Human-readable "setting — tech names" lines for all matched rules. */
export function conditionalStartReasons(
  facts: EmpireFacts | null,
): { setting: string; names: string[] }[] {
  if (!facts) return [];
  const out: { setting: string; names: string[] }[] = [];
  for (const rule of CONDITIONAL_START_RULES) {
    if (!rule.matches(facts)) continue;
    out.push({
      setting: rule.setting,
      names: rule.keys.map((k) => TECHS.find((t) => t.key === k)?.name ?? k),
    });
  }
  return out;
}

/** Why a permanently-known tech is permanent (null = universal). */
export function startTechNote(key: string): string | null {
  for (const rule of CONDITIONAL_START_RULES) {
    if (rule.keys.includes(key)) return rule.note;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Tech lock rules                                                     */
/* ------------------------------------------------------------------ */

/** Techs that only exist for Machine Intelligence empires. */
const MACHINE_ONLY_TECHS = [
  "tech_robomodding_m", // Machine Template System (machine variant)
  "tech_mega_assembly",
  "tech_resource_processing_algorithms",
  "tech_autonomous_agents",
  "tech_synthetic_leaders", // Artificial Personality Matrix
  "tech_collective_self",
  "tech_embodied_dynamism",
  "tech_identity_initialization",
  "tech_identity_copy",
  "tech_identity_fusion",
  "tech_node_reformatting_1",
  "tech_node_reformatting_2",
  "tech_node_reformatting_3",
  "tech_node_culling_1",
  "tech_node_culling_2",
  "tech_node_culling_3",
];

/** Techs that require a gestalt consciousness (Hive Mind or Machine). */
const GESTALT_ONLY_TECHS = ["tech_living_state"];

/** Food & organic-life techs a Machine Intelligence never researches. */
const NO_MACHINE_TECHS = [
  // food economy
  "tech_eco_simulation",
  "tech_gene_crops",
  "tech_nano_vitality_crops",
  "tech_food_processing_1",
  "tech_food_processing_2",
  "tech_repeatable_improved_tile_food_output",
  "tech_alien_cloning", // Artificial Breeding
  "tech_improved_incubators",
  // biological ships & space fauna (BioGenesis / Grand Archive)
  "tech_weavers",
  "tech_harbingers",
  "tech_stingers",
  "tech_maulers",
  "tech_growth_chamber_1",
  "tech_growth_chamber_2",
  "tech_controlled_mutations",
  "tech_controlled_mutations_2",
  "tech_metabolic_gases",
  "tech_gargantuan_evolution",
  "tech_space_whale_weapon_1",
  "tech_amoeba_strike_craft_1",
  "tech_swarm_strike_craft_1",
  "tech_voidworm_immunity",
  "tech_critter_feeder",
  "tech_thrusters_bio_integration",
  "tech_hyper_drive_bio_integration",
  "tech_sensors_bio_integration",
  "tech_combat_computers_bio_integration",
  "tech_unique_mutation_cutholoid",
  "tech_unique_mutation_crystalline_entity",
  "tech_unique_mutation_restorative_enzymes",
  "tech_unique_mutation_space_amoeba",
  "tech_unique_mutation_starborne_biology",
  "tech_unique_mutation_tiyanki",
  "tech_unique_mutation_voidworm",
];

/** Food techs a pure-Lithoid empire has essentially no use for (×0.01 weight). */
const LITHOID_FOOD_TECHS = [
  "tech_eco_simulation",
  "tech_gene_crops",
  "tech_nano_vitality_crops",
  "tech_food_processing_1",
  "tech_food_processing_2",
];

const setOf = (keys: string[]) => new Set(keys);
const MACHINE_ONLY = setOf(MACHINE_ONLY_TECHS);
const GESTALT_ONLY = setOf(GESTALT_ONLY_TECHS);
const NO_MACHINE = setOf(NO_MACHINE_TECHS);
const LITHOID_FOOD = setOf(LITHOID_FOOD_TECHS);

/**
 * The whole biological ship line (Weavers / Maulers / Harbingers / Stingers
 * hulls, their growth & incubation facilities and the bio-weapon components)
 * is only offered to empires flying a biological shipset (BioGenesis) —
 * verified against the wiki's "Biological ship technologies" table.
 */
const isBioShipTech = (key: string): boolean =>
  key.startsWith("tech_weaver") ||
  key.startsWith("tech_mauler") ||
  key.startsWith("tech_stinger") ||
  key.startsWith("tech_harbinger") ||
  key.startsWith("tech_growth_chamber");

/**
 * Requirement baseline used when no empire is applied: a generic organic,
 * non-gestalt, non-psionic empire with the standard ship set. Psionics,
 * Machine Intelligence techs, the biological ship line, … stay grayed out
 * until the matching settings are applied in the "My Empire" tab.
 */
const DEFAULT_FACTS: EmpireFacts = {
  gestalt: null,
  corporate: false,
  machineSpecies: false,
  lithoid: false,
  bioShip: false,
  ethics: {},
  civics: new Set(),
  origin: "",
  traits: new Set(),
  alternatives: 3,
  trees: new Set(),
  policies: { ...DEFAULT_POLICIES, researchFocus: { ...DEFAULT_POLICIES.researchFocus } },
  perks: new Set(),
};

/**
 * Every tech that cannot be researched without meeting an empire requirement,
 * with a human-readable reason. With no empire applied the requirements are
 * checked against a generic organic empire — requirement-gated techs are
 * locked (grayed out) until the matching settings are applied.
 */
export function computeEmpireLocks(facts: EmpireFacts | null): Map<string, string> {
  const locks = new Map<string, string>();
  const f = facts ?? DEFAULT_FACTS;

  const psionicEmpire =
    (f.ethics.spiritualist ?? 0) > 0 ||
    f.traits.has("latent_psionic") ||
    f.origin === "teachers_of_shroud" ||
    f.perks.has("mind_over_matter");

  for (const t of TECHS) {
    // Research Restrictions policy — dangerous techs are outlawed
    if (
      t.dangerous &&
      !t.event &&
      f.policies.restrictions === "imposed"
    ) {
      locks.set(t.key, "Dangerous technologies are outlawed by the Research Restrictions policy");
      continue;
    }
    // Megastructure techs need the Galactic Wonders ascension perk (game rule)
    if (GALACTIC_WONDERS_TECH_KEYS.includes(t.key) && !f.perks.has("galactic_wonders")) {
      locks.set(t.key, "Requires the Galactic Wonders ascension perk");
      continue;
    }
    // Psionics — gestalts can never be psionic; everyone else needs the
    // Spiritualist ethic, a Latent Psionic species, Teachers of the Shroud
    // or the Mind over Matter ascension perk
    if (t.cat === "Psionics") {
      if (f.gestalt) {
        locks.set(t.key, "Gestalt empires (Hive Mind / Machine) cannot use psionics");
      } else if (!psionicEmpire) {
        locks.set(
          t.key,
          "Requires the Spiritualist ethic, a Latent Psionic species, the Teachers of the Shroud origin or the Mind over Matter ascension perk",
        );
      }
      continue;
    }
    // Machine Intelligence exclusive techs
    if (MACHINE_ONLY.has(t.key) && f.gestalt !== "machine") {
      locks.set(t.key, "Exclusive to Machine Intelligence empires");
      continue;
    }
    // Gestalt-only techs
    if (GESTALT_ONLY.has(t.key) && !f.gestalt) {
      locks.set(t.key, "Requires a gestalt consciousness (Hive Mind or Machine Intelligence)");
      continue;
    }
    // Organic techs machines never draw (food economy, bio ships, space fauna)
    if (
      (NO_MACHINE.has(t.key) || isBioShipTech(t.key)) &&
      f.gestalt === "machine"
    ) {
      locks.set(t.key, "Not available to Machine Intelligence empires");
      continue;
    }
    // Biological ship line — only empires flying living ships (BioGenesis)
    if (!t.event && isBioShipTech(t.key) && !f.bioShip) {
      locks.set(t.key, "Requires an empire with the biological ship set (BioGenesis)");
      continue;
    }
    // Pure-Lithoid empires don't farm
    if (
      LITHOID_FOOD.has(t.key) &&
      f.lithoid &&
      !f.machineSpecies &&
      f.gestalt !== "machine"
    ) {
      locks.set(t.key, "Lithoid species don't grow food");
      continue;
    }
    // Authority / origin exclusive technologies
    if (t.key === "tech_hive_node" && f.gestalt !== "hive") {
      locks.set(t.key, "Requires the Hive Mind authority");
      continue;
    }
    if (
      (t.key === "tech_wilderness_node" || t.key === "tech_wilderness_terraform") &&
      f.origin !== "wilderness"
    ) {
      locks.set(t.key, "Requires the Wilderness origin");
      continue;
    }
    if (t.key === "tech_critter_feeder" && f.origin !== "fruitful_partnership") {
      locks.set(t.key, "Requires the Fruitful Partnership origin");
      continue;
    }
  }
  return locks;
}

/* ------------------------------------------------------------------ */
/* Tier gating                                                         */
/* ------------------------------------------------------------------ */

/**
 * How close a research tier is to opening: a tier-N tech needs
 * TIER_UNLOCK_COUNT researched techs of tier N-1 in the same area
 * (game rule, per-area). Tiers 0–1 are always open.
 */
export function tierGateInfo(
  acquired: ReadonlySet<string>,
  area: Area,
  tier: number,
): { unlocked: boolean; have: number; need: number } {
  if (tier <= 1) return { unlocked: true, have: 0, need: 0 };
  const have = TECHS.filter(
    (t) => !t.event && t.area === area && t.tier === tier - 1 && acquired.has(t.key),
  ).length;
  return { unlocked: have >= TIER_UNLOCK_COUNT, have, need: TIER_UNLOCK_COUNT };
}

/**
 * Researched techs of the next tier (same area) whose tier gate this tech's
 * removal would break. Empty = safe to uncheck. Only fires when the gate is
 * currently met and would drop below the requirement after removal.
 */
export function tierGateDependents(
  acquired: ReadonlySet<string>,
  key: string,
): Tech[] {
  const tech = TECHS.find((t) => t.key === key);
  if (!tech || tech.tier < 1 || tech.tier >= 5) return [];
  if (!tierGateInfo(acquired, tech.area, tech.tier + 1).unlocked) return [];
  const after = new Set(acquired);
  after.delete(key);
  if (tierGateInfo(after, tech.area, tech.tier + 1).unlocked) return [];
  return TECHS.filter(
    (t) => !t.event && t.area === tech.area && t.tier === tech.tier + 1 && acquired.has(t.key),
  ).sort((a, b) => b.cost - a.cost);
}

/* ------------------------------------------------------------------ */
/* Weight modifiers                                                    */
/* ------------------------------------------------------------------ */

/** Biology techs that draw ×1.25 more often for Hive Minds (wiki-verified). */
const HIVE_BIOLOGY_TECHS = [
  "tech_genome_mapping",
  "tech_vitality_boosters",
  "tech_gene_tailoring",
  "tech_glandular_acclimation",
  "tech_gene_expressions",
  "tech_cloning",
  "tech_gene_banks",
];

const STORM_TECHS = [
  "tech_storm_prediction_1",
  "tech_storm_prediction_2",
  "tech_storm_manipulation",
  "tech_advanced_storm_manipulation",
  "tech_industrial_storm_protection",
  "tech_advanced_industrial_storm_protection",
];

const ROBOTICS_TECHS = [
  "tech_robotic_workers",
  "tech_droid_workers",
  "tech_synthetic_workers",
  "tech_robomodding",
  "tech_robomodding_points_1",
  "tech_robomodding_points_2",
  "tech_robot_assembly_complex",
];

const PACIFIST_FOOD_TECHS = [
  "tech_eco_simulation",
  "tech_gene_crops",
  "tech_nano_vitality_crops",
  "tech_food_processing_1",
];

export interface WeightInfo {
  /** total multiplier (1 = unmodified) */
  mult: number;
  /** human-readable notes for the tooltip */
  notes: string[];
}

const ethicLevel = (facts: EmpireFacts, axis: string): number => facts.ethics[axis] ?? 0;

/**
 * Curated draw-weight modifiers — wiki-verified factors where possible,
 * clearly-theme approximations otherwise (marked with "≈").
 */
export function empireWeightInfo(facts: EmpireFacts | null, tech: Tech): WeightInfo {
  const info: WeightInfo = { mult: 1, notes: [] };
  if (!facts) return info;
  const add = (mult: number, note: string) => {
    info.mult *= mult;
    info.notes.push(note);
  };

  const is = (...keys: string[]) => keys.includes(tech.key);

  /* ---- psionics ---- */
  if (tech.cat === "Psionics") {
    const s = ethicLevel(facts, "spiritualist");
    if (s === 2) add(1.5, "Fanatic Spiritualist ×1.5");
    else if (s === 1) add(1.25, "Spiritualist ×1.25");
    if (facts.origin === "teachers_of_shroud") add(2, "Teachers of the Shroud ×2");
  }

  /* ---- food economy ---- */
  if (is(...PACIFIST_FOOD_TECHS)) {
    const p = ethicLevel(facts, "pacifist");
    if (p === 2) add(1.5, "Fanatic Pacifist ×1.5");
    else if (p === 1) add(1.25, "Pacifist ×1.25");
  }
  if (is("tech_food_processing_1")) {
    if (facts.civics.has("catalytic_processing")) add(2, "Catalytic Processing ×2");
    if (facts.civics.has("agrarian_idyll") || facts.civics.has("anglers"))
      add(1.5, "Agrarian Idyll / Anglers ×1.5");
  }
  if (is("tech_bio_reactor", "tech_bio_reactor_2")) {
    if (
      facts.machineSpecies ||
      facts.lithoid ||
      facts.civics.has("catalytic_processing")
    )
      add(20, "Machine / Lithoid / Catalytic ×20");
  }

  /* ---- xenophile / xenophone biology ---- */
  if (is("tech_alien_life_studies")) {
    const x = ethicLevel(facts, "xenophile");
    if (x === 2) add(3, "Fanatic Xenophile ×3");
    else if (x === 1) add(2, "Xenophile ×2");
  }
  if (is("tech_epigenetic_triggers")) {
    const x = ethicLevel(facts, "xenophile");
    const xb = ethicLevel(facts, "xenophobe");
    if (x === 2) add(1.5, "Fanatic Xenophile ×1.5");
    else if (x === 1) add(1.25, "Xenophile ×1.25");
    if (xb === 2) add(0.5, "Fanatic Xenophobe ×0.5");
    else if (xb === 1) add(0.75, "Xenophobe ×0.75");
  }

  /* ---- leader policies (ethics) ---- */
  if (is("tech_selected_lineages")) {
    if (ethicLevel(facts, "authoritarian") > 0) add(2, "Authoritarian ×2");
    if (ethicLevel(facts, "egalitarian") > 0) add(0.25, "Egalitarian ×0.25");
  }
  if (is("tech_capacity_boosters") && ethicLevel(facts, "authoritarian") > 0)
    add(2, "Authoritarian ×2");
  if (is("tech_subdermal_stimulation") && ethicLevel(facts, "egalitarian") > 0)
    add(1.25, "Egalitarian ×1.25");
  if (is("tech_tracking_implants") && ethicLevel(facts, "authoritarian") > 0)
    add(2, "Authoritarian ×2");

  /* ---- military ---- */
  if (is("tech_synchronized_defenses")) {
    const m = ethicLevel(facts, "militarist");
    const p = ethicLevel(facts, "pacifist");
    if (m === 2) add(1.2, "Fanatic Militarist ×1.2");
    else if (m === 1) add(1.1, "Militarist ×1.1");
    if (p === 2) add(0.65, "Fanatic Pacifist ×0.65");
    else if (p === 1) add(0.75, "Pacifist ×0.75");
  }
  if (is("tech_gene_seed_purification", "tech_morphogenetic_field_mastery")) {
    const m = ethicLevel(facts, "militarist");
    if (m === 2) add(1.5, "Fanatic Militarist ×1.5");
    else if (m === 1) add(1.25, "Militarist ×1.25");
  }

  /* ---- hive biology affinity ---- */
  if (facts.gestalt === "hive" && is(...HIVE_BIOLOGY_TECHS)) {
    add(1.25, "Hive Mind ×1.25");
  }

  /* ---- cosmic storms ---- */
  if (is(...STORM_TECHS) && facts.origin === "storm_chasers") {
    add(2, "Storm Chasers origin ×2");
  }

  /* ---- robotics ---- */
  if (is(...ROBOTICS_TECHS)) {
    if (facts.gestalt === "machine") add(1.25, "≈ Machine Intelligence ×1.25");
    if (facts.origin === "mechanist") add(2, "≈ Mechanist origin ×2");
  }

  /* ---- species traits (model approximation) ---- */
  if (facts.traits.has("intelligent") || facts.traits.has("logic_engines")) {
    add(1.05, "≈ Intelligent species ×1.05");
  }
  if (facts.traits.has("natural_physicists") && tech.area === "physics")
    add(1.1, "≈ Natural Physicists ×1.1");
  if (facts.traits.has("natural_sociologists") && tech.area === "society")
    add(1.1, "≈ Natural Sociologists ×1.1");
  if (facts.traits.has("natural_engineers") && tech.area === "engineering")
    add(1.1, "≈ Natural Engineers ×1.1");

  /* ---- traditions ---- */
  // Subterfuge adoption: ×5 cloaking & detection technologies
  if (facts.trees.has("subterfuge") && SUBTERFUGE_TECH_KEYS.includes(tech.key)) {
    add(5, "Subterfuge traditions ×5");
  }
  // Expansion (Wilderness empires): ×1.25 terraforming technologies
  if (
    facts.trees.has("expansion") &&
    facts.origin === "wilderness" &&
    TERRAFORM_TECH_KEYS.includes(tech.key)
  ) {
    add(1.25, "Expansion traditions (Wilderness) ×1.25");
  }

  /* ---- research policies ---- */
  // Research focus: +25% option chance in the focused category
  const focus = facts.policies.researchFocus[tech.area];
  if (focus && focus !== "general" && focus === tech.cat) {
    add(1.25, `Research focus: ${tech.cat} ×1.25`);
  }
  // Research restrictions (wiki: rare −20% / +5%, dangerous +25% when refactored)
  if (facts.policies.restrictions === "imposed" && tech.rarity > 0) {
    add(0.8, "Restrictions Imposed: rare techs ×0.8");
  }
  if (facts.policies.restrictions === "refactored") {
    if (tech.rarity > 0) add(1.05, "Refactored Restrictions: rare techs ×1.05");
    if (tech.dangerous) add(1.25, "Refactored Restrictions: dangerous techs ×1.25");
  }

  /* ---- ascension perks ---- */
  // Technological Ascendancy: +50% rare technology draw chance
  if (facts.perks.has("technological_ascendancy") && tech.rarity > 0) {
    add(1.5, "Technological Ascendancy ×1.5");
  }

  return info;
}

/* ------------------------------------------------------------------ */
/* Appearance odds                                                     */
/* ------------------------------------------------------------------ */

/** Techs of a tier unlock after this many researched techs of the tier below. */
export const TIER_UNLOCK_COUNT = 6;

/** "12%", "<1%" or "0%" for display on cards and tooltips */
export function formatOdds(pct: number | null): string {
  if (pct == null) return "—";
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

export interface TechOdds {
  /** 0–100 chance per research choice; null = not shown (acquired/event) */
  pct: number | null;
  /** can be drawn right now */
  drawable: boolean;
  /** locked forever by the applied empire */
  locked: boolean;
  /** prereqs / tier not yet reached — pct shown dimmed "as if available" */
  blocked: boolean;
  /** why it is blocked, for the tooltip */
  blockedReason: string | null;
  baseWeight: number;
  mult: number;
  notes: string[];
}

const AREAS: Area[] = ["physics", "society", "engineering"];

/**
 * Chance that each tech appears among the research options of its area,
 * given everything currently drawable. Event techs and researched techs are
 * excluded. Techs whose prerequisites or tier aren't met yet get a dimmed
 * "as if available" value.
 */
export function computeOdds(
  acquired: Set<string>,
  activeDlcs: Set<string>,
  facts: EmpireFacts | null,
  locks: Map<string, string>,
): Map<string, TechOdds> {
  const out = new Map<string, TechOdds>();
  const alternatives = facts?.alternatives ?? 3;

  for (const area of AREAS) {
    const areaTechs = TECHS.filter((t) => !t.event && t.area === area);

    /* tier gating: N techs of the preceding tier researched */
    const researchedPerTier = [0, 0, 0, 0, 0, 0];
    for (const t of areaTechs) if (acquired.has(t.key)) researchedPerTier[t.tier]++;
    const tierUnlocked = (tier: number) =>
      tier <= 1 || researchedPerTier[tier - 1] >= TIER_UNLOCK_COUNT;

    const weightOf = (t: Tech) => {
      const w = empireWeightInfo(facts, t);
      return { eff: Math.max(0, t.weight) * w.mult, info: w };
    };

    /* which techs are drawable right now */
    const drawable = new Set<string>();
    for (const t of areaTechs) {
      if (acquired.has(t.key)) continue;
      if (t.dlc && !activeDlcs.has(t.dlc)) continue;
      if (locks.has(t.key)) continue;
      if (!tierUnlocked(t.tier)) continue;
      if (!t.prereqs.every((p) => acquired.has(p))) continue;
      drawable.add(t.key);
    }

    /* total pool weight per draw */
    let pool = 0;
    for (const key of drawable) pool += weightOf(areaTechs.find((t) => t.key === key)!).eff;

    for (const t of areaTechs) {
      if (acquired.has(t.key)) continue; // researched → no badge
      const { eff, info } = weightOf(t);

      if (locks.has(t.key)) {
        out.set(t.key, {
          pct: null, drawable: false, locked: true, blocked: false,
          blockedReason: locks.get(t.key) ?? null,
          baseWeight: t.weight, mult: info.mult, notes: info.notes,
        });
        continue;
      }

      const missingPrereqs = t.prereqs.filter((p) => !acquired.has(p));
      let blockedReason: string | null = null;
      if (missingPrereqs.length > 0) {
        blockedReason = `Needs ${missingPrereqs
          .map((p) => TECHS.find((x) => x.key === p)?.name ?? p)
          .join(", ")} first`;
      } else if (!tierUnlocked(t.tier)) {
        blockedReason = `Tier ${t.tier} opens after ${TIER_UNLOCK_COUNT} tier-${t.tier - 1} techs in this area`;
      } else if (t.dlc && !activeDlcs.has(t.dlc)) {
        blockedReason = "DLC disabled";
      }

      const isDrawable = drawable.has(t.key);
      const denom = isDrawable ? pool : pool + eff;
      const pct =
        denom > 0 && eff > 0
          ? Math.min(99, (100 * alternatives * eff) / denom)
          : 0;

      out.set(t.key, {
        pct,
        drawable: isDrawable,
        locked: false,
        blocked: !isDrawable,
        blockedReason,
        baseWeight: t.weight,
        mult: info.mult,
        notes: info.notes,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Summary helpers for the My Empire tab                               */
/* ------------------------------------------------------------------ */

export interface LockGroup {
  reason: string;
  keys: string[];
}

/** Lock reasons grouped for display. */
export function groupLocks(locks: Map<string, string>): LockGroup[] {
  const groups = new Map<string, string[]>();
  for (const [key, reason] of locks) {
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason)!.push(key);
  }
  return [...groups.entries()]
    .map(([reason, keys]) => ({ reason, keys }))
    .sort((a, b) => b.keys.length - a.keys.length);
}

/** Human-readable list of the active weight bonuses. */
export function empireBonusSummary(facts: EmpireFacts): string[] {
  const notes = new Set<string>();
  for (const t of TECHS) {
    const info = empireWeightInfo(facts, t);
    if (info.mult !== 1) for (const n of info.notes) notes.add(n);
  }
  const out = [...notes];
  if (facts.alternatives > 3) out.push(`${facts.alternatives} research alternatives`);
  return out.sort();
}

/** Empire statistics block shown in the My Empire summary. */
export interface EmpireStats {
  /** research speed multiplier (Discovery finisher +10%) */
  researchSpeed: number;
  /** research alternatives per draw */
  alternatives: number;
  /** rare technology draw multiplier */
  rareMult: number;
  /** finished tradition trees */
  trees: string[];
  /** active war doctrine (null = none / locked) */
  warDoctrine: string | null;
  /** war doctrine locked because Supremacy is not finished */
  warDoctrineLocked: boolean;
  /** defense preference (affects ship designs) */
  defensePreference: string;
  /** active ascension perks */
  perks: string[];
}

export function empireStats(facts: EmpireFacts | null): EmpireStats {
  const f = facts ?? DEFAULT_FACTS;
  const warDoctrineLocked = !f.trees.has("supremacy");
  let rareMult = 1;
  if (f.perks.has("technological_ascendancy")) rareMult *= 1.5;
  if (f.policies.restrictions === "imposed") rareMult *= 0.8;
  if (f.policies.restrictions === "refactored") rareMult *= 1.05;
  return {
    researchSpeed: f.trees.has("discovery") ? 1.1 : 1,
    alternatives: f.alternatives,
    rareMult,
    trees: TRADITION_TREES.filter((t) => f.trees.has(t.id)).map((t) => t.name),
    warDoctrine:
      warDoctrineLocked || f.policies.warDoctrine === "none"
        ? null
        : (WAR_DOCTRINE_NAMES.get(f.policies.warDoctrine) ?? null),
    warDoctrineLocked,
    defensePreference:
      DEFENSE_PREFERENCE_NAMES.get(f.policies.defense) ?? "Balanced Defenses",
    perks: ASCENSION_PERKS.filter((p) => f.perks.has(p.id)).map((p) => p.name),
  };
}

const WAR_DOCTRINE_NAMES = new Map<string, string>([
  ["defense_in_depth", "Defense in Depth"],
  ["hit_and_run", "Hit and Run"],
  ["rapid_deployment", "Rapid Deployment"],
  ["no_retreat", "No Retreat"],
]);

const DEFENSE_PREFERENCE_NAMES = new Map<string, string>([
  ["shield", "Shield Priority"],
  ["balanced", "Balanced Defenses"],
  ["armor", "Armor Priority"],
]);
