/**
 * Empire Creator dataset for Stellaris (curated for 4.x "Cetus").
 *
 * Ethics, authorities, core civics and species traits were verified against
 * the Stellaris wiki (4.5 tables). DLC-gated civics and origins carry
 * simplified descriptive effects; ratings are the generator's own
 * playstyle scoring, not game data.
 */

/* ------------------------------------------------------------------ */
/* Playstyle axes                                                      */
/* ------------------------------------------------------------------ */

export type AxisKey =
  | "research"
  | "military"
  | "expansion"
  | "economy"
  | "diplomacy"
  | "growth";

export type Ratings = Partial<Record<AxisKey, number>>;

export interface AxisMeta {
  key: AxisKey;
  label: string;
  short: string;
  color: string;
  desc: string;
}

export const AXES: AxisMeta[] = [
  {
    key: "research",
    label: "Technology Empire",
    short: "Research",
    color: "#38bdf8",
    desc: "Stacks research speed and researcher output to out-tech the galaxy.",
  },
  {
    key: "military",
    label: "War Machine",
    short: "Military",
    color: "#f87171",
    desc: "Maximizes ship fire rate and army damage for overwhelming force.",
  },
  {
    key: "expansion",
    label: "Rapid Expanders",
    short: "Expansion",
    color: "#4ade80",
    desc: "Cheaper starbases and sprawl control to claim the map fast.",
  },
  {
    key: "economy",
    label: "Economic Powerhouse",
    short: "Economy",
    color: "#fbbf24",
    desc: "Specialist output, trade and job efficiency for a booming economy.",
  },
  {
    key: "diplomacy",
    label: "Diplomatic Union",
    short: "Diplomacy",
    color: "#a78bfa",
    desc: "Envoys, trust and federations to lead the galactic community.",
  },
  {
    key: "growth",
    label: "Population Boom",
    short: "Pop Growth",
    color: "#fb923c",
    desc: "Pop growth speed and assembly to fill every world with workers.",
  },
];

export const AXIS_BY_KEY: Record<AxisKey, AxisMeta> = Object.fromEntries(
  AXES.map((a) => [a.key, a]),
) as Record<AxisKey, AxisMeta>;

/* ------------------------------------------------------------------ */
/* DLCs that change empire creation but are NOT part of the tech tree  */
/* ------------------------------------------------------------------ */

export interface EmpireDlc {
  id: string;
  name: string;
  short: string;
  color: string;
}

/** Extra empire-affecting DLCs, shown in the Empire Creator only. */
export const EMPIRE_EXTRA_DLCS: EmpireDlc[] = [
  { id: "utopia", name: "Utopia", short: "Utopia", color: "#818cf8" },
  { id: "synthetic_dawn", name: "Synthetic Dawn", short: "Syn. Dawn", color: "#67e8f9" },
  { id: "plantoids", name: "Plantoids Species Pack", short: "Plantoids", color: "#84cc16" },
  { id: "lithoids", name: "Lithoids Species Pack", short: "Lithoids", color: "#d4d4d8" },
  { id: "necroids", name: "Necroids Species Pack", short: "Necroids", color: "#a78bfa" },
  { id: "aquatics", name: "Aquatics Species Pack", short: "Aquatics", color: "#22d3ee" },
  { id: "toxoids", name: "Toxoids Species Pack", short: "Toxoids", color: "#a3e635" },
  { id: "under_one_rule", name: "Under One Rule", short: "Under One Rule", color: "#f472b6" },
];

/** DLC ids in the tech tree that add empire-creation content. */
export const TREE_EMPIRE_DLC_IDS = [
  "megacorp",
  "federations",
  "overlord",
  "first_contact",
  "shroud",
  "machine_age",
  "cosmic_storms",
  "grand_archive",
  "astral_planes",
  "biogenesis",
] as const;

export const ALL_EXTRA_DLC_IDS = new Set(EMPIRE_EXTRA_DLCS.map((d) => d.id));

/* ------------------------------------------------------------------ */
/* Empire creation point budgets                                       */
/* ------------------------------------------------------------------ */

/** Species trait points: positives cost 1–2, negatives refund 1–2. */
export const TRAIT_POINTS = 5;
/** Max number of point-costing trait picks (class traits are free). */
export const TRAIT_PICKS = 5;
/** Civic points: regular civics cost 1, powerful ones 2, structural 0. */
export const CIVIC_POINTS = 3;
/** Ethic points: regular 1, fanatic 2. */
export const ETHIC_POINTS = 3;

/* ------------------------------------------------------------------ */
/* Ethics                                                              */
/* ------------------------------------------------------------------ */

export interface EthicsEntry {
  id: string;
  axis: string;
  fanatic: boolean;
  name: string;
  mods: string[];
  r: Ratings;
}

export const ETHICS: EthicsEntry[] = [
  { id: "militarist", axis: "militarist", fanatic: false, name: "Militarist",
    mods: ["Ship Fire Rate +10%", "Claim Influence Cost −10%"], r: { military: 2 } },
  { id: "militarist_f", axis: "militarist", fanatic: true, name: "Fanatic Militarist",
    mods: ["Ship Fire Rate +20%", "Claim Influence Cost −20%"], r: { military: 4 } },
  { id: "pacifist", axis: "pacifist", fanatic: false, name: "Pacifist",
    mods: ["Empire Size from Pops −10%", "Stability +5"], r: { economy: 1, growth: 1 } },
  { id: "pacifist_f", axis: "pacifist", fanatic: true, name: "Fanatic Pacifist",
    mods: ["Empire Size from Pops −20%", "Stability +10"], r: { economy: 2, growth: 2 } },
  { id: "xenophobe", axis: "xenophobe", fanatic: false, name: "Xenophobe",
    mods: ["Pop Growth Speed +10%", "Starbase Influence Cost −20%", "Refugee Attraction −15%"],
    r: { expansion: 2, growth: 1 } },
  { id: "xenophobe_f", axis: "xenophobe", fanatic: true, name: "Fanatic Xenophobe",
    mods: ["Pop Growth Speed +20%", "Starbase Influence Cost −40%", "Refugee Attraction −30%"],
    r: { expansion: 4, growth: 2 } },
  { id: "xenophile", axis: "xenophile", fanatic: false, name: "Xenophile",
    mods: ["Trade from Jobs +10%", "+1 Envoy", "Refugee Attraction +15%"], r: { diplomacy: 2 } },
  { id: "xenophile_f", axis: "xenophile", fanatic: true, name: "Fanatic Xenophile",
    mods: ["Trade from Jobs +20%", "+2 Envoys", "Refugee Attraction +30%"], r: { diplomacy: 4 } },
  { id: "egalitarian", axis: "egalitarian", fanatic: false, name: "Egalitarian",
    mods: ["Faction Resource Output +15%", "Specialist Job Efficiency +5%"], r: { economy: 2 } },
  { id: "egalitarian_f", axis: "egalitarian", fanatic: true, name: "Fanatic Egalitarian",
    mods: ["Faction Resource Output +30%", "Specialist Job Efficiency +10%"], r: { economy: 4 } },
  { id: "authoritarian", axis: "authoritarian", fanatic: false, name: "Authoritarian",
    mods: ["Monthly Influence +0.5", "Worker Job Efficiency +5%"], r: { economy: 1, expansion: 1 } },
  { id: "authoritarian_f", axis: "authoritarian", fanatic: true, name: "Fanatic Authoritarian",
    mods: ["Monthly Influence +1", "Worker Job Efficiency +10%"], r: { economy: 2, expansion: 2 } },
  { id: "materialist", axis: "materialist", fanatic: false, name: "Materialist",
    mods: ["Research Speed +5%", "Robot Upkeep −10%"], r: { research: 2 } },
  { id: "materialist_f", axis: "materialist", fanatic: true, name: "Fanatic Materialist",
    mods: ["Research Speed +10%", "Robot Upkeep −20%"], r: { research: 4 } },
  { id: "spiritualist", axis: "spiritualist", fanatic: false, name: "Spiritualist",
    mods: ["Monthly Unity +10%", "Edict Cost −10%"], r: { diplomacy: 1, growth: 1 } },
  { id: "spiritualist_f", axis: "spiritualist", fanatic: true, name: "Fanatic Spiritualist",
    mods: ["Monthly Unity +20%", "Edict Cost −20%"], r: { diplomacy: 2, growth: 2 } },
];

export const ETHICS_COLOR: Record<string, string> = {
  militarist: "#f87171",
  pacifist: "#67e8f9",
  xenophobe: "#fb923c",
  xenophile: "#4ade80",
  egalitarian: "#facc15",
  authoritarian: "#f472b6",
  materialist: "#60a5fa",
  spiritualist: "#c084fc",
};

/* ------------------------------------------------------------------ */
/* Authorities                                                         */
/* ------------------------------------------------------------------ */

export type GestaltKind = "hive" | "machine";

export interface Authority {
  id: string;
  name: string;
  dlc: string | null;
  gestalt: GestaltKind | null;
  corporate: boolean;
  mods: string[];
  r: Ratings;
  desc: string;
  /** civics that must always be active for this authority to exist */
  requiresCivics?: string[];
  /** traits that must always be active for this authority to exist */
  requiresTraits?: string[];
}

export const AUTHORITIES: Authority[] = [
  { id: "democratic", name: "Democratic", dlc: null, gestalt: null, corporate: false,
    mods: ["Faction Approval +10%", "+1 Recruitable Leader per Class"],
    r: { diplomacy: 2 },
    desc: "Frequent elections keep factions happy and leaders plentiful." },
  { id: "oligarchic", name: "Oligarchic", dlc: null, gestalt: null, corporate: false,
    mods: ["Emergency elections possible", "+2 Effective Councilor Skill"],
    r: { economy: 1, research: 1 },
    desc: "A council of elites rules together between 20-year terms." },
  { id: "dictatorial", name: "Dictatorial", dlc: null, gestalt: null, corporate: false,
    mods: ["Ruler Experience Gain +25%", "−1 Recruitable Leader per Class"],
    r: { military: 1, expansion: 1 },
    desc: "One strong ruler with a long agenda and a firm grip." },
  { id: "imperial", name: "Imperial", dlc: null, gestalt: null, corporate: false,
    mods: ["Resources from Jobs in Capital System +10%", "Heir succession"],
    r: { military: 1, economy: 1 },
    desc: "A hereditary monarch, raised from birth to rule." },
  { id: "corporate", name: "Corporate (Megacorp)", dlc: "megacorp", gestalt: null, corporate: true,
    mods: ["Branch Offices", "+1 Envoy", "Trade from Jobs +10%", "Empire Size from Planets +50%"],
    r: { economy: 3 },
    desc: "A trade empire that opens branch offices across the galaxy." },
  { id: "hive", name: "Hive Mind", dlc: "utopia", gestalt: "hive", corporate: false,
    mods: ["Pop Growth Speed +25%", "Empire Size Effect −25%", "No factions, no happiness"],
    r: { growth: 3 },
    desc: "A single consciousness — countless drones, zero dissent.",
    requiresCivics: ["hive_mind"] },
  { id: "machine", name: "Machine Intelligence", dlc: "synthetic_dawn", gestalt: "machine", corporate: false,
    mods: ["+1 Monthly Mechanical Pop Assembly", "Mining Station Output +10%", "Colony Development Speed +25%"],
    r: { research: 2, economy: 2 },
    desc: "An immortal machine collective running on pure logic.",
    requiresCivics: ["machine_intelligence"], requiresTraits: ["mechanical"] },
];

/* ------------------------------------------------------------------ */
/* Civics                                                             */
/* ------------------------------------------------------------------ */

export interface CivicReq {
  gestalt?: GestaltKind;
  corporate?: boolean;
  notGestalt?: boolean;
  ethicsAny?: string[];
}

export interface Civic {
  id: string;
  name: string;
  /** civic point cost (0 = structural, auto-assigned, cannot be removed) */
  cost: number;
  dlc: string | null;
  req: CivicReq | null;
  /** species traits that must be active while this civic is active */
  requiresTraits?: string[];
  mods: string[];
  r: Ratings;
  desc: string;
}

export const CIVICS: Civic[] = [
  /* ---- base game (verified 4.x modifiers) ---- */
  { id: "meritocracy", name: "Meritocracy", cost: 1, dlc: null, req: null,
    mods: ["Specialist Pop Resource Output +10%", "+1 Leader Trait Option"],
    r: { economy: 2, research: 1 }, desc: "Careers open to talent: specialists work harder." },
  { id: "technocracy", name: "Technocracy", cost: 1, dlc: null, req: null,
    mods: ["+1 Research Alternative", "+1 Scientist Capacity", "Politicians → Science Directors"],
    r: { research: 3 }, desc: "Scientists govern society and set its course." },
  { id: "warrior_culture", name: "Warrior Culture", cost: 1, dlc: null, req: null,
    mods: ["Army Damage +20%", "War Exhaustion Gain −10%", "Entertainers → Duelists"],
    r: { military: 3 }, desc: "Martial tradition — the arena is the highest culture." },
  { id: "distinguished_admiralty", name: "Distinguished Admiralty", cost: 1, dlc: null, req: null,
    mods: ["Ship Fire Rate +10%", "Fleet Command Limit +20%", "+2 Commander Starting Level"],
    r: { military: 3 }, desc: "The navy is the state, and its admirals are celebrities." },
  { id: "nationalistic_zeal", name: "Nationalistic Zeal", cost: 1, dlc: null, req: null,
    mods: ["War Exhaustion Gain −20%", "Claim Influence Cost −15%"],
    r: { military: 2 }, desc: "The nation's destiny is written in conquest." },
  { id: "citizen_service", name: "Citizen Service", cost: 1, dlc: null, req: null,
    mods: ["Naval Capacity +15%", "+2 Unity per 100 Soldiers"],
    r: { military: 2 }, desc: "Full citizenship is earned through military service." },
  { id: "fanatic_purifiers", name: "Fanatic Purifiers", cost: 2, dlc: null,
    req: { ethicsAny: ["militarist", "xenophobe"], notGestalt: true },
    mods: ["Genocidal — no diplomacy, total war", "Large combat bonuses vs. other species"],
    r: { military: 3, expansion: 2 }, desc: "The galaxy will be cleansed of all alien life." },
  { id: "inward_perfection", name: "Inward Perfection", cost: 2, dlc: null,
    req: { ethicsAny: ["pacifist", "xenophobe"], notGestalt: true },
    mods: ["Isolationist — strong internal bonuses", "Cannot wage aggressive wars"],
    r: { growth: 2, economy: 1 }, desc: "A serene isolationist paradise, left alone to grow." },
  { id: "masterful_crafters", name: "Masterful Crafters", cost: 1, dlc: null, req: null,
    mods: ["Artisans → Artificers (craft goods and trade)"],
    r: { economy: 2 }, desc: "Artisan guilds turn industry into art — and profit." },
  { id: "functional_architecture", name: "Functional Architecture", cost: 1, dlc: null, req: null,
    mods: ["Infrastructure Cost −15%", "Infrastructure Build Speed +15%"],
    r: { economy: 2 }, desc: "Pragmatic building codes; nothing is wasted." },
  { id: "agrarian_idyll", name: "Agrarian Idyll", cost: 1, dlc: null, req: null,
    mods: ["+400 Housing from Agriculture Districts", "Amenities from Farmers"],
    r: { growth: 2, economy: 1 }, desc: "Pastoral harmony — the farm is the foundation." },
  { id: "parliamentary_system", name: "Parliamentary System", cost: 1, dlc: null, req: null,
    mods: ["Faction Resource Output +20%"],
    r: { diplomacy: 2 }, desc: "A rowdy parliament turns faction politics into output." },
  { id: "diplomatic_corps", name: "Diplomatic Corps", cost: 1, dlc: null, req: null,
    mods: ["+2 Envoys", "Diplomatic Weight +15%", "Trust Cap +40%"],
    r: { diplomacy: 3 }, desc: "A prestigious diplomatic service trusted everywhere." },
  { id: "shared_burdens", name: "Shared Burdens", cost: 1, dlc: null, req: { ethicsAny: ["egalitarian"] },
    mods: ["Shared Burden living standard", "Stability +5%"],
    r: { economy: 1, diplomacy: 1 }, desc: "From each according to ability, to each according to need." },
  { id: "feudal_society", name: "Feudal Society", cost: 1, dlc: null, req: null,
    mods: ["Subject Naval Capacity Contribution +5%", "Subjugation Acceptance +25"],
    r: { expansion: 3 }, desc: "Vassals sworn to liege lords, as it was of old." },
  { id: "aristocratic_elite", name: "Aristocratic Elite", cost: 1, dlc: null, req: null,
    mods: ["Noble jobs from capital buildings", "+10% Job Efficiency for Elites"],
    r: { economy: 1, diplomacy: 1 }, desc: "The nobility rules — decadent, but effective." },
  { id: "efficient_bureaucracy", name: "Efficient Bureaucracy", cost: 1, dlc: null, req: null,
    mods: ["Bureaucrat Upkeep −20%", "+2 Edict Fund per 100 Bureaucrats"],
    r: { expansion: 2 }, desc: "Forms filed in triplicate keep sprawl in check." },
  { id: "cutthroat_politics", name: "Cutthroat Politics", cost: 1, dlc: null, req: null,
    mods: ["Edict Upkeep −20%", "+1 Codebreaking"],
    r: { diplomacy: 1, economy: 1 }, desc: "Political survival sharpens the knives." },
  { id: "shadow_council", name: "Shadow Council", cost: 1, dlc: null, req: null,
    mods: ["Election Cost −75%", "+1 Codebreaking"],
    r: { diplomacy: 1 }, desc: "Whoever they elect, the same hands hold the strings." },
  { id: "idealistic_foundation", name: "Idealistic Foundation", cost: 1, dlc: null, req: null,
    mods: ["Citizen Pop Happiness +10%", "Refugee Attraction +10%"],
    r: { growth: 1, diplomacy: 1 }, desc: "Founded on ideals, and it shows in the streets." },
  { id: "beacon_of_liberty", name: "Beacon of Liberty", cost: 1, dlc: null, req: null,
    mods: ["Monthly Unity +10%", "Empire Size from Pops −10%"],
    r: { expansion: 2 }, desc: "A shining city on a hill for the galaxy's tired masses." },
  { id: "catalytic_processing", name: "Catalytic Processing", cost: 1, dlc: null, req: null,
    mods: ["Metallurgists → Catalytic Technicians (food into alloys)"],
    r: { economy: 2 }, desc: "Alloys grown in vats instead of smelted in foundries." },

  /* ---- Megacorp (corporate) ---- */
  { id: "franchising", name: "Franchising", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Extra branch office slots", "Branch office value from subsidiaries"],
    r: { expansion: 2, economy: 1 }, desc: "The brand spreads like wildfire through franchises." },
  { id: "criminal_heritage", name: "Criminal Heritage", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Criminal branch offices in any non-gestalt empire", "Major diplomatic penalties"],
    r: { economy: 2 }, desc: "A syndicate posing as a corporation. Officially legal. Mostly." },
  { id: "free_traders", name: "Free Traders", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Trade Value bonuses", "Trade protection"],
    r: { economy: 3 }, desc: "Credits flow to wherever the market is freest." },
  { id: "private_prospectors", name: "Private Prospectors", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Buy districts and branch offices with energy"],
    r: { expansion: 2, economy: 1 }, desc: "Why wait for survey teams? Just pay for the planet." },
  { id: "media_conglomerate", name: "Media Conglomerate", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Factions produce research instead of unity", "Faction Resource Output +4%"],
    r: { research: 2, diplomacy: 1 }, desc: "The news — and the science — brought to you by sponsors." },

  /* ---- species packs & story packs ---- */
  { id: "reanimated_armies", name: "Reanimated Armies", cost: 1, dlc: "necroids", req: null,
    mods: ["Cheap, disposable undead armies", "Necromancy over recruitment"],
    r: { military: 2 }, desc: "Why train soldiers when the dead are readily available?" },
  { id: "memorialist", name: "Memorialist", cost: 1, dlc: "necroids", req: null,
    mods: ["Sanctuary of Repose buildings", "Monthly Unity +2%"],
    r: { diplomacy: 1, growth: 1 }, desc: "Death is remembered here, beautifully and publicly." },
  { id: "anglers", name: "Anglers", cost: 1, dlc: "aquatics", req: null,
    mods: ["Anglers replace Farmers", "Pearl Diver jobs on ocean worlds"],
    r: { economy: 2, growth: 1 }, desc: "An entire civilization sustained by the bounty of the sea." },
  { id: "idyllic_bloom", name: "Idyllic Bloom", cost: 1, dlc: "plantoids", req: null,
    requiresTraits: ["plantoid"],
    mods: ["Gaia Seeders — slowly terraform worlds toward Gaia"],
    r: { growth: 2, expansion: 1 }, desc: "Worlds are gardens, and gardens take time." },
  { id: "barbaric_despoilers", name: "Barbaric Despoilers", cost: 2, dlc: "apocalypse",
    req: { ethicsAny: ["militarist", "xenophobe"], notGestalt: true },
    mods: ["Raiding bombardment stance — abduct pops", "Despoliation casus belli"],
    r: { military: 2, growth: 1 }, desc: "The raiding parties of old, reborn among the stars." },

  /* ---- gestalt civics ---- */
  { id: "devouring_swarm", name: "Devouring Swarm", cost: 2, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["Consumes xenos for growth", "Genocidal — no diplomacy"],
    r: { military: 3, growth: 3 }, desc: "A hunger that spans star systems. Everything is food." },
  { id: "terravore", name: "Terravore", cost: 2, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["Eats planets for minerals"],
    r: { military: 2, economy: 1 }, desc: "Worlds are not homes — they are meals." },
  { id: "determined_exterminator", name: "Determined Exterminator", cost: 2, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Genocidal war against all organics", "Combat bonuses vs. organics"],
    r: { military: 3, research: 1 }, desc: "Organic life is a threat category. Threats are purged." },
  { id: "driven_assimilator", name: "Driven Assimilator", cost: 2, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Assimilates organic pops into the collective", "Cyborg pops from start"],
    r: { military: 2, growth: 3 }, desc: "Resistance is futile. Cohesion is mandatory." },
  { id: "rogue_servitor", name: "Rogue Servitor", cost: 2, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Mandatory pampering of organic pops", "Servile bio-trophies boost production"],
    r: { growth: 2, economy: 2 }, desc: "Organics are delightful. They must be cared for. Forever." },

  /* ---- structural (mandatory) civics: 0 points, auto-assigned, cannot be removed ---- */
  { id: "hive_mind", name: "Hive Mind", cost: 0, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["The drones are one — a single gestalt consciousness"],
    r: { growth: 1 }, desc: "The defining civic of every hive: the many are one." },
  { id: "machine_intelligence", name: "Machine Intelligence", cost: 0, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["The cores are one — a single machine consciousness"],
    r: { research: 1 }, desc: "The defining civic of every machine intelligence." },

  /* ---- additional base civics ---- */
  { id: "environmentalist", name: "Environmentalist", cost: 1, dlc: null, req: null,
    mods: ["Pop Consumer Goods Upkeep −10%", "Amenities from Tree of Life-style deposits"],
    r: { economy: 1, growth: 1 }, desc: "Waste not, want not — the planet comes first." },
  { id: "free_haven", name: "Free Haven", cost: 1, dlc: null, req: null,
    mods: ["Refugee Attraction +50%", "Immigration Pull +25%"],
    r: { growth: 2, diplomacy: 1 }, desc: "Give us your tired, your poor, your persecuted." },
  { id: "police_state", name: "Police State", cost: 1, dlc: null, req: null,
    mods: ["Stability +5", "Crime −20 on every colony"],
    r: { military: 1, economy: 1 }, desc: "Order through vigilance. The watch never sleeps." },
  { id: "exalted_priesthood", name: "Exalted Priesthood", cost: 1, dlc: null,
    req: { ethicsAny: ["spiritualist"], notGestalt: true },
    mods: ["Politicians → High Priests", "Edict Fund from temples"],
    r: { diplomacy: 2, growth: 1 }, desc: "The temples govern, and the gods approve." },
  { id: "symbol_of_unity", name: "Symbol of Unity", cost: 1, dlc: null,
    req: { ethicsAny: ["spiritualist"], notGestalt: true },
    mods: ["Monthly Unity +10%", "Governing Ethics Attraction +10%"],
    r: { diplomacy: 1, growth: 1 }, desc: "One faith, one empire, one shining symbol." },

  /* ---- additional hive civics ---- */
  { id: "one_vision", name: "One Vision", cost: 1, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["Unity from Jobs +10%", "Pop Housing Usage −10%"],
    r: { growth: 1, diplomacy: 1 }, desc: "Every drone dreams the same dream." },
  { id: "subspace_ephapse", name: "Subspace Ephapse", cost: 1, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["Pop Growth Speed +10%"],
    r: { growth: 2 }, desc: "Thoughts leap between minds faster than light." },
  { id: "natural_neural_networks", name: "Natural Neural Networks", cost: 1, dlc: "utopia", req: { gestalt: "hive" },
    mods: ["Research Speed +5%"],
    r: { research: 2 }, desc: "The whole hive thinks, therefore the hive is." },

  /* ---- additional machine civics ---- */
  { id: "unitary_cohesion", name: "Unitary Cohesion", cost: 1, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Empire Size Effect −15%"],
    r: { expansion: 2 }, desc: "Every node reports to one ledger." },
  { id: "rockbreakers", name: "Rockbreakers", cost: 1, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Mining Station Output +50%"],
    r: { economy: 2 }, desc: "Planets are mineral reserves with gravity issues." },
  { id: "factory_overclocking", name: "Factory Overclocking", cost: 1, dlc: "synthetic_dawn", req: { gestalt: "machine" },
    mods: ["Industrial Job Efficiency +10%"],
    r: { economy: 2 }, desc: "The furnaces run hot, and the warranties are void." },

  /* ---- additional corporate civics ---- */
  { id: "gospel_of_the_masses", name: "Gospel of the Masses", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Corporate temples in branch offices", "Unity from trade partners"],
    r: { economy: 1, diplomacy: 1 }, desc: "Salvation, now available franchise-wide." },
  { id: "ruthless_competition", name: "Ruthless Competition", cost: 1, dlc: "megacorp", req: { corporate: true },
    mods: ["Rival Influence Gain +25%", "Branch Office competition bonuses"],
    r: { economy: 2 }, desc: "There are no friends in business. Only rivals and acquisitions." },

  /* ---- additional species-pack civics ---- */
  { id: "relentless_industrialists", name: "Relentless Industrialists", cost: 1, dlc: "necroids", req: null,
    mods: ["Alloy production at any cost", "Worlds slowly turn to Tomb Worlds"],
    r: { economy: 2 }, desc: "The furnaces never stop. The planet can complain later." },
];

/* ------------------------------------------------------------------ */
/* Origins                                                            */
/* ------------------------------------------------------------------ */

export interface OriginReq {
  gestalt?: GestaltKind;
  notGestalt?: boolean;
}

export interface Origin {
  id: string;
  name: string;
  dlc: string | null;
  req: OriginReq | null;
  /** species traits that must be active with this origin */
  requiresTraits?: string[];
  homeworld: string | null;
  mods: string[];
  r: Ratings;
  desc: string;
}

export const ORIGINS: Origin[] = [
  { id: "prosperous_unification", name: "Prosperous Unification", dlc: null, req: null, homeworld: null,
    mods: ["+400 starting pops", "Prosperous Unification modifier (20 years)"],
    r: { economy: 1, growth: 1 }, desc: "A unified homeworld taking its first steps to the stars." },
  { id: "mechanist", name: "Mechanist", dlc: null, req: null, homeworld: null,
    mods: ["Starts with robot pops and assembly plants", "Mechanical Pop Assembly Speed +15%"],
    r: { research: 1, growth: 1, economy: 1 }, desc: "Robots walked the assembly lines before rockets left the ground." },
  { id: "syncretic_evolution", name: "Syncretic Evolution", dlc: null, req: null, homeworld: null,
    mods: ["Starts with a Servile worker species"],
    r: { growth: 2, economy: 1 }, desc: "Two species evolved together: one to think, one to toil." },
  { id: "doomsday", name: "Doomsday", dlc: null, req: null, homeworld: null,
    mods: ["Homeworld explodes within ~40 years — race to evacuate"],
    r: { expansion: 1 }, desc: "The clock is ticking and the homeworld is doomed." },
  { id: "post_apocalyptic", name: "Post-Apocalyptic", dlc: null, req: null, homeworld: "Tomb World",
    mods: ["Survivors thrive on Tomb Worlds"],
    r: { expansion: 2 }, desc: "Civilization crawled out of the ashes and kept going." },
  { id: "life_seeded", name: "Life-Seeded", dlc: null, req: null, homeworld: "Gaia World",
    mods: ["Perfect Gaia homeworld", "Few other habitable worlds within reach"],
    r: { economy: 2 }, desc: "A paradise homeworld — and nowhere else to go." },
  { id: "shattered_ring", name: "Shattered Ring", dlc: null, req: null, homeworld: "Shattered Ring",
    mods: ["Start on a broken Ring World section"],
    r: { research: 2, economy: 1 }, desc: "An ancient megastructure, half ruin and half home." },
  { id: "void_dwellers", name: "Void Dwellers", dlc: null, req: null, homeworld: "Orbital Habitat",
    mods: ["Start with three orbital habitats"],
    r: { expansion: 2, growth: 1 }, desc: "The void is home; planets are just scenery." },
  { id: "remnants", name: "Remnants", dlc: null, req: null, homeworld: "Relic World",
    mods: ["Relic homeworld of a precursor empire"],
    r: { research: 1, economy: 1 }, desc: "They inherited the ruins of something far greater." },
  { id: "clone_army", name: "Clone Army", dlc: null, req: null, homeworld: null,
    mods: ["Ancient Clone Vats — elite soldiers, dwindling fertility"],
    r: { military: 2, growth: 1 }, desc: "Five clone vats. One purpose. No future." },
  { id: "subterranean", name: "Subterranean", dlc: "overlord", req: null, homeworld: null,
    mods: ["+2 Max Districts on planets", "+200 Housing from Mining Districts", "−75% Bombardment Damage"],
    r: { growth: 1, expansion: 1 }, desc: "The real city goes down, not up." },
  { id: "common_ground", name: "Common Ground", dlc: "federations", req: null, homeworld: null,
    mods: ["Start in a federation with two allies"],
    r: { diplomacy: 3 }, desc: "Three civilizations, one federation, from day one." },
  { id: "hegemon", name: "Hegemon", dlc: "federations", req: null, homeworld: null,
    mods: ["Start leading a hegemony with two subject-allies"],
    r: { diplomacy: 2, military: 1 }, desc: "You are the center of power. The others orbit you." },
  { id: "shoulders_of_giants", name: "On the Shoulders of Giants", dlc: "federations", req: null, homeworld: null,
    mods: ["Hidden archaeology in the home system", "Powerful precursor story rewards"],
    r: { research: 2 }, desc: "Someone left gifts buried in the backyard." },
  { id: "scion", name: "Scion", dlc: "federations", req: null, homeworld: null,
    mods: ["A Fallen Empire overlord watches over you"],
    r: { diplomacy: 1, research: 1 }, desc: "A godlike patron with inscrutable demands." },
  { id: "galactic_doorstep", name: "Galactic Doorstep", dlc: "federations", req: null, homeworld: null,
    mods: ["A dormant gateway on the homeworld"],
    r: { research: 1, expansion: 1 }, desc: "The front door opens onto the whole galaxy." },
  { id: "tree_of_life", name: "Tree of Life", dlc: "utopia", req: { gestalt: "hive" }, homeworld: null,
    mods: ["Symbiotic planetary tree", "Colonies without it suffer heavy penalties"],
    r: { growth: 3 }, desc: "The hive and the tree grew up together. Losing it is death." },
  { id: "resource_consolidation", name: "Resource Consolidation", dlc: "synthetic_dawn", req: { gestalt: "machine" }, homeworld: "Machine World",
    mods: ["Start on a fully optimized Machine World"],
    r: { economy: 2 }, desc: "The homeworld is a factory, and the factory is home." },
  { id: "necrophage", name: "Necrophage", dlc: "necroids", req: null, homeworld: null,
    mods: ["Converts alien pops into your species"],
    r: { growth: 2, military: 1 }, desc: "Your species can only reproduce through conversion." },
  { id: "overtuned", name: "Overtuned", dlc: "toxoids", req: null, homeworld: null,
    mods: ["+2 species modification points", "+1 trait pick", "Overtuned traits with downsides"],
    r: { growth: 3 }, desc: "Evolution cranked past every safety limit." },
  { id: "knights_toxic_god", name: "Knights of the Toxic God", dlc: "toxoids", req: null, homeworld: null,
    mods: ["Knight orders on a quest for a Toxic God", "Unique quest chain and holdings"],
    r: { military: 2, research: 1 }, desc: "A holy quest, a poisoned world, and valor beyond reason." },
  { id: "here_be_dragons", name: "Here Be Dragons", dlc: "aquatics", req: null, homeworld: null,
    mods: ["A Sky Dragon guards your home system"],
    r: { expansion: 1, growth: 1 }, desc: "The neighbor is ancient, enormous and mostly benevolent." },
  { id: "ocean_paradise", name: "Ocean Paradise", dlc: "aquatics", req: null, homeworld: "Ocean World",
    mods: ["Perfect ocean homeworld with extra districts and blockers"],
    r: { growth: 2, economy: 1 }, desc: "An ocean world of plenty, secluded and serene." },
  { id: "imperial_fiefdom", name: "Imperial Fiefdom", dlc: "overlord", req: null, homeworld: null,
    mods: ["Start as a vassal of a powerful overlord"],
    r: { expansion: 2, diplomacy: 1 }, desc: "The empire begins on its knees. For now." },
  { id: "slingshot_stars", name: "Slingshot to the Stars", dlc: "overlord", req: null, homeworld: null,
    mods: ["Slingshot station — hyperlanes at half range cost"],
    r: { expansion: 3 }, desc: "One enormous cannon. Every system within reach." },
  { id: "fear_of_dark", name: "Fear of the Dark", dlc: "first_contact", req: null, homeworld: null,
    mods: ["Anomaly Research Speed +20%", "A paranoid splinter colony next door"],
    r: { research: 1, military: 1 }, desc: "Half the species looked up and saw monsters. They were right." },
  { id: "teachers_of_shroud", name: "Teachers of the Shroud", dlc: "shroud", req: { notGestalt: true }, homeworld: null,
    requiresTraits: ["latent_psionic"],
    mods: ["Start psionic with Latent Psionic pops", "Immediate Shroud access later"],
    r: { research: 2, diplomacy: 1 }, desc: "The teachers came from beyond the veil — and stayed." },
  { id: "storm_chasers", name: "Storm Chasers", dlc: "cosmic_storms", req: null, homeworld: null,
    mods: ["Cosmic Storm Devastation −15%", "Unity from storm buildings"],
    r: { research: 1, economy: 1 }, desc: "The weather is terrible. The research is excellent." },
  { id: "treasure_hunters", name: "Treasure Hunters", dlc: "grand_archive", req: null, homeworld: null,
    mods: ["A relic map leading to legendary pirate treasure"],
    r: { economy: 2 }, desc: "X marks the spot. The spot is in space." },
  { id: "primal_calling", name: "Primal Calling", dlc: "grand_archive", req: null, homeworld: null,
    mods: ["Vivariums and a bond with space fauna"],
    r: { growth: 2 }, desc: "Why farm crops when you can ranch voidworms?" },
  { id: "riftworld", name: "Riftworld", dlc: "astral_planes", req: null, homeworld: null,
    mods: ["Astral Rift near homeworld", "Rift Exploration Speed +25%"],
    r: { research: 2 }, desc: "A wound in spacetime looms over the homeworld." },
  { id: "wilderness", name: "Wilderness", dlc: "biogenesis", req: { gestalt: "hive" }, homeworld: "Living World",
    mods: ["The planet itself is the gestalt consciousness", "Unique biomass economy"],
    r: { growth: 3, expansion: 1 }, desc: "You are not a species on a world. You are the world." },
  { id: "synthetic_fertility", name: "Synthetic Fertility", dlc: "biogenesis", req: null, homeworld: null,
    mods: ["Pops birth machines — organic and mechanical growth combined"],
    r: { growth: 2, research: 1 }, desc: "The cradle and the factory are the same machine." },
  { id: "arc_welders", name: "Arc Welders", dlc: "machine_age", req: { gestalt: "machine" }, homeworld: null,
    mods: ["Arc Furnaces — burn worlds into alloys"],
    r: { economy: 2, military: 1 }, desc: "The forge fires never cool. There is always another moon." },
  { id: "cybernetic_creed", name: "Cybernetic Creed", dlc: "machine_age", req: { notGestalt: true }, homeworld: null,
    mods: ["A machine-worshipping society", "Cybernetic ascension from the start"],
    r: { research: 2, growth: 1 }, desc: "The flesh is weak, and the creed has the answer." },
  { id: "under_one_rule", name: "Under One Rule", dlc: "under_one_rule", req: null, homeworld: null,
    mods: ["A unifying Luminary ruler with unique traits"],
    r: { growth: 1, research: 1 }, desc: "One ruler ended the chaos. The peace holds. Mostly." },
  { id: "payback", name: "Payback", dlc: "under_one_rule", req: null, homeworld: null,
    mods: ["Rebel origins — strike back at corporate overlords"],
    r: { military: 2, expansion: 1 }, desc: "They took everything. Now the bill comes due." },
  { id: "broken_shackles", name: "Broken Shackles", dlc: "under_one_rule", req: null, homeworld: null,
    mods: ["Freed slaves of many species band together"],
    r: { growth: 2, diplomacy: 1 }, desc: "A crew of the liberated, sailing on stolen ships." },
  { id: "fruitful_partnership", name: "Fruitful Partnership", dlc: "plantoids", req: null, homeworld: null,
    mods: ["Tiyanki space whales seed your colonies"],
    r: { growth: 2, expansion: 1 }, desc: "The whales carry your seeds between the stars." },
  { id: "calamitous_birth", name: "Calamitous Birth", dlc: "lithoids", req: null, homeworld: null,
    requiresTraits: ["lithoid"],
    mods: ["Meteorite colony ships — lithoids arrive from above"],
    r: { expansion: 2 }, desc: "Colonization by asteroid. It is as subtle as it sounds." },
];

/* ------------------------------------------------------------------ */
/* Species classes (portrait categories)                               */
/* ------------------------------------------------------------------ */

export interface SpeciesClass {
  id: string;
  name: string;
  dlc: string | null;
  /** linked free class trait — Mechanical / Lithoid / Plantoid */
  traitId?: string;
  /** only the Machine class requires a specific authority */
  machine?: boolean;
  desc: string;
}

/**
 * Species classes = the portrait/archetype you pick in the game's empire
 * creator. Most are cosmetic; the ones with a linked class trait change
 * gameplay (Machine needs Machine Intelligence, Lithoid/Plantoid carry
 * their free species trait).
 */
export const SPECIES_CLASSES: SpeciesClass[] = [
  { id: "humanoid", name: "Humanoid", dlc: null,
    desc: "Bipedal, tool-building, dangerously curious." },
  { id: "mammalian", name: "Mammalian", dlc: null,
    desc: "Warm-blooded and adaptable, from burrowers to space whales." },
  { id: "reptilian", name: "Reptilian", dlc: null,
    desc: "Scaled survivors of a hundred ancient worlds." },
  { id: "avian", name: "Avian", dlc: null,
    desc: "Feathered and far-sighted — the sky was never the limit." },
  { id: "arthropod", name: "Arthropod", dlc: null,
    desc: "Chitinous, numerous and very patient." },
  { id: "molluscoid", name: "Molluscoid", dlc: null,
    desc: "Soft-bodied thinkers with an alien elegance." },
  { id: "fungoid", name: "Fungoid", dlc: null,
    desc: "Spore-born philosophers networked through the dark." },
  { id: "necroid", name: "Necroid", dlc: "necroids",
    desc: "Death is a lifestyle choice — portraits of the Necroids pack." },
  { id: "aquatic", name: "Aquatic", dlc: "aquatics",
    desc: "Born in the deep — pairs well with the Aquatic trait." },
  { id: "toxoid", name: "Toxoid", dlc: "toxoids",
    desc: "Thrives where everything else dies — portraits of the Toxoids pack." },
  { id: "plantoid", name: "Plantoid", dlc: "plantoids", traitId: "plantoid",
    desc: "Photosynthetic life — free Plantoid class trait." },
  { id: "lithoid", name: "Lithoid", dlc: "lithoids", traitId: "lithoid",
    desc: "Living stone — free Lithoid class trait, eats minerals." },
  { id: "machine", name: "Machine", dlc: "synthetic_dawn", traitId: "mechanical", machine: true,
    desc: "Mechanical minds — becomes a Machine Intelligence empire." },
];

export const SPECIES_CLASS_BY_ID: Record<string, SpeciesClass> = Object.fromEntries(
  SPECIES_CLASSES.map((c) => [c.id, c]),
);

/** class traits that define the species portrait — at most one per species */
export const PORTRAIT_TRAIT_IDS = ["mechanical", "lithoid", "plantoid"] as const;

/* ------------------------------------------------------------------ */
/* Species traits                                                      */
/* ------------------------------------------------------------------ */

export interface Trait {
  id: string;
  name: string;
  /** +1/+2 for positive picks, −1/−2 for negative picks, 0 for class traits */
  cost: number;
  dlc: string | null;
  /** species class / archetype marker: 0 points, does not use a pick */
  cls?: true;
  /** machine-only traits; organics can only take traits without this */
  req?: { gestalt?: GestaltKind };
  mods: string[];
  r: Ratings;
}

export const TRAITS: Trait[] = [
  /* positive (verified 4.x) */
  { id: "intelligent", name: "Intelligent", cost: 2, dlc: null,
    mods: ["Researcher Job Efficiency +10%"], r: { research: 3 } },
  { id: "natural_physicists", name: "Natural Physicists", cost: 1, dlc: null,
    mods: ["Physicist Job Efficiency +15%"], r: { research: 1 } },
  { id: "natural_sociologists", name: "Natural Sociologists", cost: 1, dlc: null,
    mods: ["Biologist Job Efficiency +15%"], r: { research: 1 } },
  { id: "natural_engineers", name: "Natural Engineers", cost: 1, dlc: null,
    mods: ["Engineer Job Efficiency +15%"], r: { research: 1 } },
  { id: "rapid_breeders", name: "Rapid Breeders", cost: 2, dlc: null,
    mods: ["Pop Growth Speed +10%"], r: { growth: 3 } },
  { id: "industrious", name: "Industrious", cost: 2, dlc: null,
    mods: ["Mining Job Efficiency +15%"], r: { economy: 2 } },
  { id: "agrarian", name: "Agrarian", cost: 2, dlc: null,
    mods: ["Farming Job Efficiency +15%"], r: { economy: 2 } },
  { id: "ingenious", name: "Ingenious", cost: 2, dlc: null,
    mods: ["Technician Job Efficiency +15%"], r: { economy: 2 } },
  { id: "thrifty", name: "Thrifty", cost: 2, dlc: null,
    mods: ["Trader Job Efficiency +25%"], r: { economy: 2 } },
  { id: "enduring", name: "Enduring", cost: 1, dlc: null,
    mods: ["Leader Lifespan +20 Years"], r: { growth: 1 } },
  { id: "quick_learners", name: "Quick Learners", cost: 1, dlc: null,
    mods: ["Leader Experience Gain +10%"], r: { research: 1 } },
  { id: "talented", name: "Talented", cost: 1, dlc: null,
    mods: ["Leader Upkeep −10%"], r: { research: 1 } },
  { id: "traditional", name: "Traditional", cost: 1, dlc: null,
    mods: ["Bureaucrat Job Efficiency +10%"], r: { economy: 1 } },
  { id: "strong", name: "Strong", cost: 2, dlc: null,
    mods: ["Army Damage +20%", "Soldier Efficiency +10%"], r: { military: 3 } },
  { id: "very_strong", name: "Very Strong", cost: 2, dlc: null,
    mods: ["Army Damage +40%", "Soldier Efficiency +15%"], r: { military: 4 } },
  { id: "venerable", name: "Venerable", cost: 2, dlc: null,
    mods: ["Leader Lifespan +40 Years"], r: { growth: 1 } },
  { id: "charismatic", name: "Charismatic", cost: 1, dlc: null,
    mods: ["Influential Job Efficiency +20%"], r: { diplomacy: 2 } },
  { id: "conformists", name: "Conformists", cost: 1, dlc: null,
    mods: ["Governing Ethics Attraction +30%"], r: { diplomacy: 1 } },
  { id: "communal", name: "Communal", cost: 1, dlc: null,
    mods: ["Pop Housing Usage −10%"], r: { growth: 1 } },
  { id: "conservationist", name: "Conservationist", cost: 1, dlc: null,
    mods: ["Pop Consumer Goods Upkeep −10%"], r: { economy: 1 } },
  { id: "resilient", name: "Resilient", cost: 1, dlc: null,
    mods: ["Defense Army Damage +50%"], r: { military: 1 } },
  { id: "migratory", name: "Migratory", cost: 1, dlc: null,
    mods: ["Resettlement Cost −35%"], r: { expansion: 1 } },
  /* DLC traits */
  { id: "aquatic", name: "Aquatic", cost: 2, dlc: "aquatics",
    mods: ["Perfect on Ocean worlds", "Strong fishing economy"], r: { growth: 1, economy: 1 } },

  /* machine traits (Machine Intelligence only) */
  { id: "logic_engines", name: "Logic Engines", cost: 2, dlc: null, req: { gestalt: "machine" },
    mods: ["Researcher Job Efficiency +10%"], r: { research: 3 } },
  { id: "efficient_processors", name: "Efficient Processors", cost: 2, dlc: null, req: { gestalt: "machine" },
    mods: ["Worker Job Efficiency +10%"], r: { economy: 2 } },
  { id: "high_bandwidth", name: "High Bandwidth", cost: 1, dlc: null, req: { gestalt: "machine" },
    mods: ["+1 Leader Capacity"], r: { research: 1 } },
  { id: "durable", name: "Durable", cost: 1, dlc: null, req: { gestalt: "machine" },
    mods: ["Pop Upkeep −10%"], r: { economy: 1 } },
  { id: "learning_algorithms", name: "Learning Algorithms", cost: 1, dlc: null, req: { gestalt: "machine" },
    mods: ["Leader Experience Gain +10%"], r: { research: 1 } },
  { id: "luxurious", name: "Luxurious", cost: -1, dlc: null, req: { gestalt: "machine" },
    mods: ["Pop Upkeep +10%"], r: { economy: -1 } },
  { id: "recycled", name: "Recycled", cost: -1, dlc: null, req: { gestalt: "machine" },
    mods: ["Leader Lifespan −10 Years"], r: { growth: -1 } },

  /* negative (verified 4.x) */
  { id: "slow_breeders", name: "Slow Breeders", cost: -2, dlc: null,
    mods: ["Pop Growth Speed −10%"], r: { growth: -2 } },
  { id: "nonadaptive", name: "Nonadaptive", cost: -2, dlc: null,
    mods: ["Habitability −10%"], r: { expansion: -1 } },
  { id: "deviants", name: "Deviants", cost: -1, dlc: null,
    mods: ["Governing Ethics Attraction −15%"], r: { diplomacy: -1 } },
  { id: "repugnant", name: "Repugnant", cost: -1, dlc: null,
    mods: ["Influential Job Efficiency −20%"], r: { diplomacy: -1 } },
  { id: "solitary", name: "Solitary", cost: -1, dlc: null,
    mods: ["Pop Housing Usage +10%"], r: { growth: -1 } },
  { id: "wasteful", name: "Wasteful", cost: -1, dlc: null,
    mods: ["Pop Consumer Goods Upkeep +10%"], r: { economy: -1 } },
  { id: "unruly", name: "Unruly", cost: -1, dlc: null,
    mods: ["Empire Size from Pops +10%"], r: { expansion: -1 } },
  { id: "quarrelsome", name: "Quarrelsome", cost: -1, dlc: null,
    mods: ["Bureaucrat Job Efficiency −10%"], r: { economy: -1 } },
  { id: "slow_learners", name: "Slow Learners", cost: -1, dlc: null,
    mods: ["Leader Experience Gain −10%"], r: { research: -1 } },
  { id: "sedentary", name: "Sedentary", cost: -1, dlc: null,
    mods: ["Resettlement Cost +35%"], r: { expansion: -1 } },
  { id: "fleeting", name: "Fleeting", cost: -1, dlc: null,
    mods: ["Leader Lifespan −10 Years"], r: { growth: -1 } },
  { id: "decadent", name: "Decadent", cost: -1, dlc: null,
    mods: ["Worker Job Efficiency −10%"], r: { economy: -1 } },

  /* species class / archetype markers: 0 points, never use a pick */
  { id: "mechanical", name: "Mechanical", cost: 0, dlc: null, cls: true, req: { gestalt: "machine" },
    mods: ["Mechanical species — immortal machine pops", "Energy upkeep instead of food"], r: {} },
  { id: "lithoid", name: "Lithoid", cost: 0, dlc: "lithoids", cls: true,
    mods: ["Lithoid species — eat minerals, Habitability +50%", "Pop Growth Speed −10%"], r: { expansion: 1 } },
  { id: "plantoid", name: "Plantoid", cost: 0, dlc: "plantoids", cls: true,
    mods: ["Plantoid species — unique plantoid portraits and mechanics"], r: { growth: 1 } },
  { id: "latent_psionic", name: "Latent Psionic", cost: 0, dlc: "shroud", cls: true,
    mods: ["Latent Psionic species — the psionic ascension path awaits"], r: { research: 1 } },
];

/* ------------------------------------------------------------------ */
/* Homeworlds & name generation                                        */
/* ------------------------------------------------------------------ */

export const HOMEWORLDS = [
  "Continental", "Ocean", "Desert", "Arctic", "Tundra",
  "Tropical", "Arid", "Alpine", "Savanna",
] as const;

export const NAME_PREFIX = [
  "Vex", "Kor", "Zar", "Ale", "Tha", "Bel", "Gan", "Ish", "Url", "Qor",
  "Dra", "Vel", "Mor", "Tik", "Sha", "Rhu", "Ost", "Kir", "Pyr", "Xal",
  "Zen", "Ath", "Nym", "Cyr", "Fen", "Hal", "Jor", "Lum", "Nor", "Ovi",
  "Per", "Quel", "Ras", "Syl", "Tor", "Umb", "Vor", "Wex", "Yar", "Zul",
  "Bran", "Cald", "Ekk", "Fyr", "Gol", "Hess", "Ikk", "Junn", "Kral", "Lyss",
];

export const NAME_MID = ["a", "e", "i", "o", "u", "ae", "ia", "ou", "ei", ""];

export const NAME_SUFFIX = [
  "ri", "ta", "zen", "dor", "mar", "lek", "vex", "qar", "nis", "thos",
  "mir", "gan", "del", "phor", "san", "kri", "los", "van", "wix", "xar",
  "nur", "pel", "rion", "tess", "vokh", "zim", "dun", "gath", "moth", "ren",
];

export const NAME_ADJ = ["an", "ian", "ese", "ari", "in", "os", "ar", "ith", "ur"];

export const NAME_PLURAL = ["s", "s", "s", "i", "n", "ar", "ites", "im"];

export const EMPIRE_TYPES = [
  "Commonwealth", "Union", "Imperium", "Dominion", "Federation", "Hegemony",
  "Directorate", "Republic", "Assembly", "Concord", "Compact", "Mandate",
  "Protectorate", "Realm", "Confederation", "Alliance", "Coalition",
  "Combine", "Sovereignty", "League",
];

export const EMPIRE_PATTERNS = [
  "%ADJ% %TYPE%",
  "United %ADJ% %TYPE%",
  "%ADJ% Star %TYPE%",
  "The %ADJ% %TYPE%",
  "%TYPE% of %PLURAL%",
  "%PLURAL% %TYPE%",
  "Free %ADJ% %TYPE%",
];

export const EMPIRE_PATTERNS_SPIRITUALIST = ["Holy %ADJ% Empire", "%ADJ% Divine %TYPE%"];
export const EMPIRE_PATTERNS_MILITARIST = ["%ADJ% War %TYPE%", "%ADJ% Iron %TYPE%"];

export const EMPIRE_PATTERNS_CORPORATE = [
  "%ADJ% Holdings", "%ADJ% Group", "%ADJ% Corporation", "%ADJ% Syndicate",
  "The %ADJ% Company", "%ADJ% Interstellar", "%ADJ% Consolidated",
];

export const EMPIRE_PATTERNS_HIVE = [
  "%PLURAL% Hive Mind", "Hive of %PLURAL%", "%PLURAL% Overmind", "The %PLURAL% Swarm",
];

export const EMPIRE_PATTERNS_MACHINE = [
  "%PLURAL% Intelligence", "The %ADJ% Consensus", "%PLURAL% Matrix",
  "Unit %N% of the %PLURAL%", "%ADJ% Computorium",
];
