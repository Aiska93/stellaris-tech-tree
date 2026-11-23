/**
 * Traditions, policies and ascension perks for "My Empire".
 *
 * Effect data follows the Stellaris wiki (4.5 tables, verified 2026-11):
 *   - Traditions: up to 7 trees; Discovery grants +1 research alternative
 *     (Science Division) and +10% research speed (finisher); Subterfuge
 *     multiplies cloaking / detection tech draw weights ×5; Expansion
 *     (Wilderness empires) ×1.25 terraforming techs; Supremacy's finisher
 *     unlocks the War Doctrine policies.
 *   - Policies: Research Focus (+25% research option chance in the focused
 *     category), Research Restrictions (imposed locks dangerous techs and
 *     ×0.8 rare chance; refactored ×1.05 rare / ×1.25 dangerous), War
 *     Doctrines (exact ship stat modifiers), Defense Preferences.
 *   - Ascension perks: 8 slots, one per finished tradition tree (+1 from the
 *     Ascension Theory technology). Technological Ascendancy ×1.5 rare tech
 *     chance, Mind over Matter unlocks the psionic tech line, Galactic
 *     Wonders unlocks the megastructure techs.
 *
 * Tree availability mirrors the game: DLC trees only appear while their DLC
 * is active, gestalt empires get Synchronicity / Versatility instead of
 * Harmony / Adaptability.
 */

import type { Area } from "@/lib/techtree";

/* ------------------------------------------------------------------ */
/* Traditions                                                          */
/* ------------------------------------------------------------------ */

export interface TraditionTree {
  id: string;
  name: string;
  /** lucide icon shown inside the emblem */
  icon: string;
  /** emblem color (game-inspired) */
  color: string;
  /** DLC required for this tree (null = base game) */
  dlc: string | null;
  /** only offered to gestalt empires ("gestalt"), never ("never") or "always" */
  gestalt: "always" | "only" | "never";
  /** short effect summary shown under the name */
  effect: string;
  /** longer tooltip text */
  desc: string;
}

export const TRADITION_TREES: TraditionTree[] = [
  {
    id: "discovery",
    name: "Discovery",
    icon: "telescope",
    color: "#38bdf8",
    dlc: null,
    gestalt: "always",
    effect: "+1 research alternative · +10% research speed",
    desc: "Science Division grants +1 research alternative and +1 scientist capacity; the finisher grants +10% research speed and research cooperative federations.",
  },
  {
    id: "expansion",
    name: "Expansion",
    icon: "rocket",
    color: "#4ade80",
    dlc: null,
    gestalt: "always",
    effect: "×1.25 terraforming techs (Wilderness)",
    desc: "Wilderness empires draw terraforming technologies ×1.25 more often; colony development and starbase cost bonuses elsewhere.",
  },
  {
    id: "prosperity",
    name: "Prosperity",
    icon: "coins",
    color: "#facc15",
    dlc: null,
    gestalt: "always",
    effect: "Economy bonuses",
    desc: "Empire-wide economy: −10% infrastructure upkeep and cost, +5% resources from jobs.",
  },
  {
    id: "supremacy",
    name: "Supremacy",
    icon: "swords",
    color: "#f87171",
    dlc: null,
    gestalt: "always",
    effect: "Unlocks War Doctrines · +10% ship fire rate",
    desc: "Overwhelming Force grants +10% ship fire rate; the finisher unlocks the War Doctrine policies and the Supremacist diplomatic stance.",
  },
  {
    id: "harmony",
    name: "Harmony",
    icon: "flower-2",
    color: "#2dd4bf",
    dlc: null,
    gestalt: "never",
    effect: "Stability & pop upkeep",
    desc: "−10% pop upkeep, +3 stability, +25% planetary ascension effect (individualist empires only).",
  },
  {
    id: "synchronicity",
    name: "Synchronicity",
    icon: "network",
    color: "#2dd4bf",
    dlc: null,
    gestalt: "only",
    effect: "Stability & node bonuses",
    desc: "−10% pop upkeep, +3 stability, +25% planetary ascension effect (gestalt empires only).",
  },
  {
    id: "diplomacy",
    name: "Diplomacy",
    icon: "handshake",
    color: "#60a5fa",
    dlc: null,
    gestalt: "never",
    effect: "Federation Code always researchable",
    desc: "The Federation tradition makes the Federation Code technology a permanent research option and boosts federation cohesion.",
  },
  {
    id: "domination",
    name: "Domination",
    icon: "crown",
    color: "#c084fc",
    dlc: null,
    gestalt: "always",
    effect: "Worker & slave output",
    desc: "+5% worker output, +0.5 monthly influence, −5% empire size from pops.",
  },
  {
    id: "adaptability",
    name: "Adaptability",
    icon: "leaf",
    color: "#a3e635",
    dlc: null,
    gestalt: "never",
    effect: "Habitability +10%",
    desc: "+10% habitability, −15% strategic resource cost (organic empires only).",
  },
  {
    id: "versatility",
    name: "Versatility",
    icon: "cog",
    color: "#a3e635",
    dlc: null,
    gestalt: "only",
    effect: "Replicator upkeep −10%",
    desc: "−10% replicator upkeep, +10% mechanical pop assembly speed (Machine Intelligence only).",
  },
  {
    id: "enmity",
    name: "Enmity",
    icon: "flame",
    color: "#fb7185",
    dlc: null,
    gestalt: "always",
    effect: "Bonuses vs rivals",
    desc: "+1 max rivalries; Eclipse grants up to +10% research after winning an Animosity war.",
  },
  {
    id: "subterfuge",
    name: "Subterfuge",
    icon: "venetian-mask",
    color: "#94a3b8",
    dlc: null,
    gestalt: "always",
    effect: "×5 cloaking & detection techs",
    desc: "Adoption grants +1 codebreaking and ×5 chance to draw cloaking and detection technologies (Nemesis tree; in this app it boosts the First Contact cloaking line).",
  },
  {
    id: "statecraft",
    name: "Statecraft",
    icon: "landmark",
    color: "#fbbf24",
    dlc: null,
    gestalt: "always",
    effect: "Council & agendas",
    desc: "+50 edict fund, +25% council agenda speed, −5% empire size (Galactic Paragons tree).",
  },
  {
    id: "aptitude",
    name: "Aptitude",
    icon: "graduation-cap",
    color: "#f472b6",
    dlc: null,
    gestalt: "always",
    effect: "Leader bonuses",
    desc: "−25% leader cost, +10% leader lifespan, +1 effective leader skill level (Galactic Paragons tree).",
  },
  {
    id: "fortification",
    name: "Fortification",
    icon: "castle",
    color: "#fb923c",
    dlc: "apocalypse",
    gestalt: "always",
    effect: "+33% starbase health & damage",
    desc: "Defensive Zeal grants +33% starbase / defense platform health and damage; the finisher unlocks the Eternal Vigilance ascension perk.",
  },
  {
    id: "politics",
    name: "Politics",
    icon: "scale",
    color: "#818cf8",
    dlc: "federations",
    gestalt: "never",
    effect: "Galactic Community weight",
    desc: "+1 envoy, −25% resolution proposal and veto cost (Federations tree; requires the Galactic Community).",
  },
  {
    id: "archivism",
    name: "Archivism",
    icon: "book-open",
    color: "#d6d3d1",
    dlc: "grand_archive",
    gestalt: "always",
    effect: "+30% scientist XP · archaeology",
    desc: "Xeno-Paleontology grants +30% scientist experience gain and +30% archaeology excavation speed (Grand Archive tree).",
  },
  {
    id: "domestication",
    name: "Domestication",
    icon: "paw-print",
    color: "#fdba74",
    dlc: "grand_archive",
    gestalt: "always",
    effect: "Space fauna",
    desc: "Taming and breeding space fauna (Grand Archive tree).",
  },
];

export const MAX_TRADITION_TREES = 7;

/** techs drawn ×5 more often with the Subterfuge tree */
export const SUBTERFUGE_TECH_KEYS = [
  "tech_cloaking_1",
  "tech_cloaking_2",
  "tech_cloaking_3",
  "tech_cloaking_dark_matter",
  "tech_detection_array",
  "tech_dark_matter_detection",
  "tech_assisted_detection",
];

/** techs drawn ×1.25 more often for Wilderness empires with Expansion */
export const TERRAFORM_TECH_KEYS = [
  "tech_volcanic_terraforming",
  "tech_ecological_adaptation",
  "tech_climate_restoration",
  "tech_georadiation_terraforming",
];

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

export type WarDoctrineId =
  | "none"
  | "defense_in_depth"
  | "hit_and_run"
  | "rapid_deployment"
  | "no_retreat";

export interface WarDoctrine {
  id: WarDoctrineId;
  name: string;
  desc: string;
  /** ship stat modifiers (multipliers unless noted) — exact 4.5 values */
  fireRate?: number;
  weaponsRange?: number;
  damageReduction?: number;
  disengageChance?: number;
  sublightSpeed?: number;
  neverDisengage?: boolean;
  /** who may pick this doctrine */
  requires?: string;
}

export const WAR_DOCTRINES: WarDoctrine[] = [
  { id: "none", name: "No War Doctrine", desc: "No active doctrine." },
  {
    id: "defense_in_depth",
    name: "Defense in Depth",
    desc: "+10% fire rate inside your own territory.",
    fireRate: 1.1,
    requires: "Finished the Supremacy tradition tree",
  },
  {
    id: "hit_and_run",
    name: "Hit and Run",
    desc: "+2 disengagement opportunities, +33% disengagement chance, −25% emergency FTL damage risk.",
    disengageChance: 1.33,
    requires: "Finished the Supremacy tradition tree",
  },
  {
    id: "rapid_deployment",
    name: "Rapid Deployment",
    desc: "+25% sublight speed, +10% weapons range.",
    sublightSpeed: 1.25,
    weaponsRange: 1.1,
    requires: "Finished the Supremacy tradition tree",
  },
  {
    id: "no_retreat",
    name: "No Retreat",
    desc: "Ships never disengage, +33% ship fire rate, +50% emergency FTL cooldown.",
    fireRate: 1.33,
    neverDisengage: true,
    requires: "Supremacy tree + Militarist, Gestalt or Fanatic Purifiers",
  },
];

export type ResearchFocusId = "general" | string; // or a category name

/** focusable categories per area (wiki Research policies table) */
export const RESEARCH_FOCUS_CATEGORIES: Record<Area, string[]> = {
  physics: ["Computing", "Particles", "Field Manipulation"],
  society: ["New Worlds", "Statecraft", "Biology", "Military Theory"],
  engineering: ["Materials", "Propulsion", "Voidcraft", "Industry"],
};

export type RestrictionsId = "none" | "imposed" | "refactored";

export const RESTRICTION_OPTIONS: {
  id: RestrictionsId;
  name: string;
  desc: string;
}[] = [
  {
    id: "none",
    name: "No Restrictions",
    desc: "No limits on what may be researched.",
  },
  {
    id: "imposed",
    name: "Restrictions Imposed",
    desc: "Dangerous technologies can never appear; −20% rare technology research option chance.",
  },
  {
    id: "refactored",
    name: "Refactored Restrictions",
    desc: "+5% rare technology option chance, +25% dangerous technology option chance, +10% researcher upkeep.",
  },
];

export type DefensePreferenceId = "shield" | "balanced" | "armor";

export const DEFENSE_PREFERENCE_OPTIONS: {
  id: DefensePreferenceId;
  name: string;
  desc: string;
  armorShare: number;
}[] = [
  {
    id: "shield",
    name: "Shield Priority",
    desc: "75% shield / 25% armor components.",
    armorShare: 0.25,
  },
  {
    id: "balanced",
    name: "Balanced Defenses",
    desc: "50% shield / 50% armor components.",
    armorShare: 0.5,
  },
  {
    id: "armor",
    name: "Armor Priority",
    desc: "75% armor / 25% shield components.",
    armorShare: 0.75,
  },
];

/** policy bundle stored in the empire config */
export interface PolicyConfig {
  warDoctrine: WarDoctrineId;
  researchFocus: Record<Area, ResearchFocusId>;
  restrictions: RestrictionsId;
  defense: DefensePreferenceId;
}

export const DEFAULT_POLICIES: PolicyConfig = {
  warDoctrine: "none",
  researchFocus: { physics: "general", society: "general", engineering: "general" },
  restrictions: "none",
  defense: "balanced",
};

/* ------------------------------------------------------------------ */
/* Ascension perks                                                     */
/* ------------------------------------------------------------------ */

export interface AscensionPerk {
  id: string;
  name: string;
  icon: string;
  color: string;
  dlc: string | null;
  /** human-readable requirement shown when locked */
  requires?: string;
  /** effect summary */
  effect: string;
}

export const ASCENSION_PERKS: AscensionPerk[] = [
  {
    id: "technological_ascendancy",
    name: "Technological Ascendancy",
    icon: "atom",
    color: "#38bdf8",
    dlc: null,
    effect: "×1.5 rare technology draw chance",
  },
  {
    id: "mind_over_matter",
    name: "Mind over Matter",
    icon: "brain",
    color: "#c084fc",
    dlc: null,
    requires: "Non-gestalt empire",
    effect: "Unlocks the psionic technology line",
  },
  {
    id: "galactic_wonders",
    name: "Galactic Wonders",
    icon: "orbit",
    color: "#fbbf24",
    dlc: null,
    effect: "Unlocks Ring World, Dyson Sphere & Matter Decompressor techs",
  },
  {
    id: "voidborne",
    name: "Voidborne",
    icon: "blocks",
    color: "#60a5fa",
    dlc: null,
    effect: "Always research the next habitat technology tier",
  },
  {
    id: "eternal_vigilance",
    name: "Eternal Vigilance",
    icon: "shield-check",
    color: "#fb923c",
    dlc: null,
    requires: "Finished the Fortification tradition tree",
    effect: "+25% starbase damage & hull, +50% defense platform cap",
  },
  {
    id: "galactic_force_projection",
    name: "Galactic Force Projection",
    icon: "ship",
    color: "#f87171",
    dlc: null,
    effect: "+20% fleet command limit, +150 naval capacity",
  },
  {
    id: "world_shaper",
    name: "World Shaper",
    icon: "globe",
    color: "#4ade80",
    dlc: null,
    effect: "Unlocks Gaia World terraforming",
  },
  {
    id: "archaeo_engineers",
    name: "Archaeo-Engineers",
    icon: "bone",
    color: "#d6d3d1",
    dlc: "ancient_relics",
    effect: "+33% archaeotech weapon damage, +25% specimens output",
  },
  {
    id: "mechromancy",
    name: "Mechromancy",
    icon: "cpu",
    color: "#22d3ee",
    dlc: "machine_age",
    requires: "Machine Intelligence",
    effect: "+15% L / XL / T slot weapon damage",
  },
  {
    id: "the_flesh_is_weak",
    name: "The Flesh is Weak",
    icon: "wrench",
    color: "#94a3b8",
    dlc: null,
    requires: "Non-gestalt empire",
    effect: "Unlocks the Cybernetics tradition tree",
  },
  {
    id: "synthetic_age",
    name: "Synthetic Age",
    icon: "bot",
    color: "#e2e8f0",
    dlc: "machine_age",
    requires: "Machine Intelligence",
    effect: "Unlocks the Synthetics tradition tree",
  },
  {
    id: "colossus_project",
    name: "Colossus Project",
    icon: "crosshair",
    color: "#f87171",
    dlc: "apocalypse",
    effect: "Build the Colossus · −5% ship upkeep",
  },
  {
    id: "defender_of_the_galaxy",
    name: "Defender of the Galaxy",
    icon: "medal",
    color: "#fde047",
    dlc: null,
    effect: "+50% damage to endgame crises",
  },
  {
    id: "transcendent_learning",
    name: "Transcendent Learning",
    icon: "graduation-cap",
    color: "#f472b6",
    dlc: null,
    effect: "+25% leader experience gain",
  },
];

export const MAX_ASCENSION_PERKS = 8;

/** megastructure techs locked until Galactic Wonders is picked (game rule) */
export const GALACTIC_WONDERS_TECH_KEYS = [
  "tech_ring_world",
  "tech_dyson_sphere",
  "tech_matter_decompressor",
];
