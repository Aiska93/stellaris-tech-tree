/**
 * Ship designer data + "best design" generator for the Ships tab.
 *
 * Hull sections are a simplified per-class layout (marked ≈ in the UI);
 * weapon stats are the exact 4.5 wiki values for lasers, plasma launchers,
 * lances, particle launchers, the Ancient Cavitation Collapser and Matter
 * Disintegrators — the remaining families use long-standing classic values
 * (marked "≈" on the stats panel). War Doctrine modifiers are exact.
 *
 * A design is generated from:
 *   - the technologies the user has researched (acquired set),
 *   - the selected trait (offence / defence / balanced),
 *   - the Defense Preference policy and War Doctrine of the applied empire,
 *   - damage perks (Mechromancy, Archaeo-Engineers).
 */

import { WAR_DOCTRINES, type PolicyConfig } from "@/lib/empireExtras";

export type ShipTrait = "offence" | "defence" | "balanced";
export type SlotSize = "S" | "M" | "L" | "X" | "G" | "H" | "P" | "T";
export type WeaponClass = "energy" | "kinetic" | "explosive" | "strike";

/* ------------------------------------------------------------------ */
/* Weapon components                                                   */
/* ------------------------------------------------------------------ */

export interface WeaponSizeStats {
  /** average damage per hit */
  avg: number;
  /** cooldown in days */
  cd: number;
  /** max range (min range is 0 unless noted) */
  range: number;
  accuracy: number;
  tracking: number;
  power: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  cls: WeaponClass;
  /** tech key that unlocks it (null = available with the hull) */
  tech: string | null;
  sizes: Partial<Record<SlotSize, WeaponSizeStats>>;
  /** damage modifiers vs shield / armor / hull (1 = 100%) */
  mods: { shield: number; armor: number; hull: number };
  /** fully penetrates shields & armor (disruptors, arc emitters) */
  penetrating?: boolean;
  /** stats are approximations, not exact 4.5 wiki numbers */
  approx?: boolean;
  archaeo?: boolean;
  dlc?: string | null;
}

const laserMods = { shield: 0.5, armor: 1.5, hull: 1.25 };
const plasmaMods = { shield: 0.25, armor: 2.0, hull: 1.5 };
const lanceMods = { shield: 0.5, armor: 2.0, hull: 1.5 };
const kineticMods = { shield: 1.25, armor: 0.75, hull: 1.0 };

/** helper: laser-style family where each tier scales damage */
const laserFamily = (
  tiers: { tech: string; name: string; s: number; m: number; l: number; power: [number, number, number] }[],
): WeaponDef[] =>
  tiers.map((t) => ({
    id: t.tech,
    name: t.name,
    cls: "energy",
    tech: t.tech,
    approx: false,
    mods: laserMods,
    sizes: {
      S: { avg: t.s, cd: 4.25, range: 40, accuracy: 90, tracking: 50, power: t.power[0] },
      M: { avg: t.m, cd: 5.0, range: 60, accuracy: 90, tracking: 30, power: t.power[1] },
      L: { avg: t.l, cd: 5.7, range: 80, accuracy: 90, tracking: 5, power: t.power[2] },
    },
  }));

export const WEAPONS: WeaponDef[] = [
  /* ---- energy: lasers (exact) ---- */
  ...laserFamily([
    { tech: "tech_lasers_1", name: "Red Laser", s: 11, m: 27.5, l: 66, power: [5, 13, 30] },
    { tech: "tech_lasers_2", name: "Blue Laser", s: 14.5, m: 36.5, l: 87, power: [7, 17, 39] },
    { tech: "tech_lasers_3", name: "UV Laser", s: 18.5, m: 46.5, l: 111, power: [10, 23, 51] },
    { tech: "tech_lasers_4", name: "X-Ray Laser", s: 24, m: 60.5, l: 144, power: [13, 30, 57] },
    { tech: "tech_lasers_5", name: "Gamma Laser", s: 31.5, m: 79, l: 189, power: [17, 39, 88] },
  ]),
  /* ---- energy: plasma (exact) ---- */
  ...([
    { tech: "tech_plasma_1", name: "Plasma Thrower", v: [22.5, 56.5, 135], power: [13, 27, 63] },
    { tech: "tech_plasma_2", name: "Plasma Accelerator", v: [29.5, 74, 177], power: [17, 36, 82] },
    { tech: "tech_plasma_3", name: "Plasma Cannon", v: [38.5, 96.5, 231], power: [23, 47, 107] },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "energy",
    tech: t.tech,
    approx: false,
    mods: plasmaMods,
    sizes: {
      S: { avg: t.v[0], cd: 5.0, range: 40, accuracy: 80, tracking: 40, power: t.power[0] },
      M: { avg: t.v[1], cd: 5.7, range: 60, accuracy: 80, tracking: 20, power: t.power[1] },
      L: { avg: t.v[2], cd: 6.4, range: 80, accuracy: 80, tracking: 5, power: t.power[2] },
    },
  })),
  /* ---- energy: lances (exact) ---- */
  {
    id: "tech_energy_lance_1",
    name: "Particle Lance",
    cls: "energy",
    tech: "tech_energy_lance_1",
    approx: false,
    mods: lanceMods,
    sizes: { X: { avg: 1050, cd: 9.95, range: 150, accuracy: 85, tracking: 0, power: 200 } },
  },
  {
    id: "tech_energy_lance_2",
    name: "Tachyon Lance",
    cls: "energy",
    tech: "tech_energy_lance_2",
    approx: false,
    mods: lanceMods,
    sizes: { X: { avg: 1365, cd: 9.95, range: 150, accuracy: 85, tracking: 0, power: 260 } },
  },
  /* ---- energy: particle launchers / G slot (exact) ---- */
  {
    id: "tech_energy_torpedoes_1",
    name: "Proton Launcher",
    cls: "energy",
    tech: "tech_energy_torpedoes_1",
    approx: false,
    mods: { shield: 0.5, armor: 1.5, hull: 1.75 },
    sizes: { G: { avg: 74, cd: 21.25, range: 120, accuracy: 75, tracking: 0, power: 118 } },
  },
  {
    id: "tech_energy_torpedoes_2",
    name: "Neutron Launcher",
    cls: "energy",
    tech: "tech_energy_torpedoes_2",
    approx: false,
    mods: { shield: 0.5, armor: 1.5, hull: 1.75 },
    sizes: { G: { avg: 96, cd: 21.25, range: 120, accuracy: 75, tracking: 0, power: 154 } },
  },
  /* ---- energy: penetrating (≈) ---- */
  ...(["tech_disruptors_1", "tech_disruptors_2", "tech_disruptors_3"] as const).map<
    WeaponDef
  >((tech, i) => ({
    id: tech,
    name: ["Disruptor", "Void Disruptor", "Phase Disruptor"][i],
    cls: "energy",
    tech,
    approx: true,
    penetrating: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: {
      S: { avg: 14 + i * 5, cd: 4.25, range: 30, accuracy: 100, tracking: 50, power: 8 + i * 2 },
      M: { avg: 34 + i * 12, cd: 4.25, range: 40, accuracy: 100, tracking: 25, power: 18 + i * 4 },
    },
  })),
  {
    id: "tech_arc_emitter_1",
    name: "Arc Emitter",
    cls: "energy",
    tech: "tech_arc_emitter_1",
    approx: true,
    penetrating: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: { X: { avg: 102, cd: 9.95, range: 100, accuracy: 100, tracking: 0, power: 80 } },
  },
  {
    id: "tech_arc_emitter_2",
    name: "Focused Arc Emitter",
    cls: "energy",
    tech: "tech_arc_emitter_2",
    approx: true,
    penetrating: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: { X: { avg: 155, cd: 9.95, range: 100, accuracy: 100, tracking: 0, power: 120 } },
  },
  /* ---- energy: extradimensional (exact) ---- */
  {
    id: "tech_extradimensional_weapon_1",
    name: "Matter Disintegrator",
    cls: "energy",
    tech: "tech_extradimensional_weapon_1",
    approx: false,
    mods: { shield: 0.25, armor: 1.5, hull: 1.5 },
    sizes: {
      S: { avg: 34.5, cd: 4.25, range: 30, accuracy: 90, tracking: 60, power: 25 },
      M: { avg: 86.5, cd: 4.25, range: 50, accuracy: 90, tracking: 30, power: 40 },
      L: { avg: 207, cd: 4.25, range: 70, accuracy: 90, tracking: 5, power: 80 },
    },
  },
  /* ---- archaeotech (cavitation exact, others ≈) ---- */
  {
    id: "tech_archaeo_lasers",
    name: "Ancient Cavitation Collapser",
    cls: "energy",
    tech: "tech_archaeo_lasers",
    approx: false,
    archaeo: true,
    mods: { shield: 0.5, armor: 1.5, hull: 1.0 },
    sizes: {
      S: { avg: 21.25, cd: 4.25, range: 40, accuracy: 90, tracking: 50, power: 15 },
      M: { avg: 51.88, cd: 5.0, range: 60, accuracy: 90, tracking: 30, power: 30 },
      L: { avg: 127.5, cd: 5.7, range: 80, accuracy: 90, tracking: 5, power: 60 },
    },
  },
  {
    id: "tech_archaeo_mass_accelerator",
    name: "Ancient Saturator Artillery",
    cls: "kinetic",
    tech: "tech_archaeo_mass_accelerator",
    approx: true,
    archaeo: true,
    mods: kineticMods,
    sizes: { X: { avg: 340, cd: 8.5, range: 130, accuracy: 75, tracking: 0, power: 190 } },
  },
  {
    id: "tech_starfire_cannon",
    name: "Starfire Cannon",
    cls: "energy",
    tech: "tech_starfire_cannon",
    approx: true,
    mods: lanceMods,
    sizes: { X: { avg: 1180, cd: 9.95, range: 150, accuracy: 85, tracking: 0, power: 240 } },
  },
  /* ---- kinetic: mass drivers (≈) ---- */
  ...([
    { tech: "tech_mass_drivers_1", name: "Mass Driver", s: 10, m: 26, l: 52 },
    { tech: "tech_mass_drivers_2", name: "Coilgun", s: 14, m: 34, l: 68 },
    { tech: "tech_mass_drivers_3", name: "Railgun", s: 20, m: 50, l: 100 },
    { tech: "tech_mass_drivers_4", name: "Advanced Railgun", s: 26, m: 64, l: 128 },
    { tech: "tech_mass_drivers_5", name: "Gauss Cannon", s: 32, m: 80, l: 160 },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "kinetic",
    tech: t.tech,
    approx: true,
    mods: kineticMods,
    sizes: {
      S: { avg: t.s, cd: 4.25, range: 45, accuracy: 75, tracking: 50, power: 5 + Math.round(t.s / 6) },
      M: { avg: t.m, cd: 4.75, range: 60, accuracy: 75, tracking: 30, power: 10 + Math.round(t.m / 6) },
      L: { avg: t.l, cd: 5.45, range: 80, accuracy: 75, tracking: 10, power: 20 + Math.round(t.l / 6) },
    },
  })),
  /* ---- kinetic: autocannons (≈) ---- */
  ...([
    { tech: "tech_autocannons_1", name: "Autocannon", avg: 7 },
    { tech: "tech_autocannons_2", name: "Ripper Cannon", avg: 10 },
    { tech: "tech_autocannons_3", name: "Stormfire Cannon", avg: 13 },
    { tech: "tech_nanite_autocannon", name: "Nanite Autocannon", avg: 16 },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "kinetic",
    tech: t.tech,
    approx: true,
    mods: { shield: 1.25, armor: 0.5, hull: 1.25 },
    sizes: { S: { avg: t.avg, cd: 1.74, range: 30, accuracy: 75, tracking: 60, power: 4 } },
  })),
  /* ---- kinetic: artillery & mega cannons (≈) ---- */
  {
    id: "tech_kinetic_artillery_2",
    name: "Kinetic Artillery",
    cls: "kinetic",
    tech: "tech_kinetic_artillery_2",
    approx: true,
    mods: kineticMods,
    sizes: { L: { avg: 130, cd: 6.35, range: 120, accuracy: 70, tracking: 10, power: 120 } },
  },
  {
    id: "tech_mass_accelerator_1",
    name: "Mega Cannon",
    cls: "kinetic",
    tech: "tech_mass_accelerator_1",
    approx: true,
    mods: kineticMods,
    sizes: { X: { avg: 320, cd: 6.8, range: 120, accuracy: 70, tracking: 0, power: 180 } },
  },
  {
    id: "tech_mass_accelerator_2",
    name: "Giga Cannon",
    cls: "kinetic",
    tech: "tech_mass_accelerator_2",
    approx: true,
    mods: kineticMods,
    sizes: { X: { avg: 400, cd: 6.8, range: 120, accuracy: 70, tracking: 0, power: 220 } },
  },
  /* ---- point defense (flak, ≈) ---- */
  ...([
    { tech: "tech_flak_batteries_1", name: "Flak Battery", avg: 4 },
    { tech: "tech_flak_batteries_2", name: "Flak Cannon", avg: 6 },
    { tech: "tech_flak_batteries_3", name: "Flak Artillery", avg: 8 },
    { tech: "tech_nanite_flak_batteries", name: "Nanite Flak Battery", avg: 10 },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "kinetic",
    tech: t.tech,
    approx: true,
    mods: { shield: 1, armor: 0.5, hull: 1.5 },
    sizes: { P: { avg: t.avg, cd: 1.74, range: 30, accuracy: 75, tracking: 60, power: 4 } },
  })),
  {
    id: "tech_archaeo_point_defence",
    name: "Ancient Defensive Web Slinger",
    cls: "kinetic",
    tech: "tech_archaeo_point_defence",
    approx: true,
    archaeo: true,
    mods: { shield: 1, armor: 0.5, hull: 1.5 },
    sizes: { P: { avg: 9, cd: 1.74, range: 30, accuracy: 80, tracking: 65, power: 5 } },
  },
  /* ---- missiles (≈) ---- */
  ...([
    { tech: "tech_missiles_1", name: "Nuclear Missile", s: 36 },
    { tech: "tech_missiles_2", name: "Fusion Missile", s: 45 },
    { tech: "tech_missiles_3", name: "Antimatter Missile", s: 57 },
    { tech: "tech_missiles_4", name: "Quantum Missile", s: 68 },
    { tech: "tech_missiles_5", name: "Marauder Missile", s: 96 },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "explosive",
    tech: t.tech,
    approx: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: {
      S: { avg: t.s, cd: 6.4, range: 90, accuracy: 100, tracking: 10, power: 5 },
      M: { avg: t.s * 2, cd: 6.4, range: 100, accuracy: 100, tracking: 5, power: 10 },
    },
  })),
  /* ---- strike craft (≈) ---- */
  ...([
    { tech: "tech_strike_craft_1", name: "Strike Craft", avg: 19 },
    { tech: "tech_strike_craft_2", name: "Improved Strike Craft", avg: 25 },
    { tech: "tech_strike_craft_3", name: "Advanced Strike Craft", avg: 35 },
    { tech: "tech_amoeba_strike_craft_1", name: "Amoeba Flagella", avg: 28 },
  ] as const).map<WeaponDef>((t) => ({
    id: t.tech,
    name: t.name,
    cls: "strike",
    tech: t.tech,
    approx: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: { H: { avg: t.avg, cd: 1, range: 60, accuracy: 80, tracking: 60, power: 3 } },
  })),
  /* ---- psionic (≈, locked to psionic empires in the tree) ---- */
  {
    id: "tech_psionic_disruptor",
    name: "Psionic Disruptor",
    cls: "energy",
    tech: "tech_psionic_disruptor",
    approx: true,
    penetrating: true,
    mods: { shield: 1, armor: 1, hull: 1 },
    sizes: { S: { avg: 22, cd: 4.25, range: 30, accuracy: 100, tracking: 50, power: 10 } },
  },
  /* ---- titan weapon (≈, available with the Titan hull) ---- */
  {
    id: "perdition_beam",
    name: "Perdition Beam",
    cls: "energy",
    tech: null,
    approx: true,
    mods: lanceMods,
    sizes: { T: { avg: 5000, cd: 27, range: 150, accuracy: 90, tracking: 0, power: 400 } },
  },
];

/* ------------------------------------------------------------------ */
/* Defense & utility components                                        */
/* ------------------------------------------------------------------ */

export interface DefenseDef {
  id: string;
  name: string;
  kind: "shield" | "armor" | "hull";
  tech: string | null;
  sizes: Partial<Record<"S" | "M" | "L", { value: number; power: number }>>;
  approx?: boolean;
  archaeo?: boolean;
}

const shieldTiers = [40, 60, 80, 120, 160];
export const DEFENSES: DefenseDef[] = [
  ...(["tech_shields_1", "tech_shields_2", "tech_shields_3", "tech_shields_4", "tech_shields_5"] as const).map<
    DefenseDef
  >((tech, i) => ({
    id: tech,
    name: ["Deflector", "Improved Deflector", "Shield Generator", "Advanced Shields", "Hyper Shields"][i],
    kind: "shield",
    tech,
    approx: true,
    sizes: {
      S: { value: shieldTiers[i], power: 8 },
      M: { value: shieldTiers[i] * 2, power: 16 },
      L: { value: shieldTiers[i] * 4, power: 32 },
    },
  })),
  {
    id: "tech_psionic_shield",
    name: "Psionic Shields",
    kind: "shield",
    tech: "tech_psionic_shield",
    approx: true,
    sizes: {
      S: { value: 200, power: 8 },
      M: { value: 400, power: 16 },
      L: { value: 800, power: 32 },
    },
  },
  {
    id: "tech_dark_matter_deflector",
    name: "Dark Matter Deflectors",
    kind: "shield",
    tech: "tech_dark_matter_deflector",
    approx: true,
    sizes: {
      S: { value: 160, power: 8 },
      M: { value: 320, power: 16 },
      L: { value: 640, power: 32 },
    },
  },
  ...(["tech_ship_armor_1", "tech_ship_armor_2", "tech_ship_armor_3", "tech_ship_armor_4", "tech_ship_armor_5"] as const).map<
    DefenseDef
  >((tech, i) => ({
    id: tech,
    name: ["Nanocomposite Armor", "Ceramo-Metal Armor", "Plasteel Armor", "Durasteel Armor", "Neutronium Armor"][i],
    kind: "armor",
    tech,
    approx: true,
    sizes: {
      S: { value: 50 + i * 15, power: 0 },
      M: { value: 100 + i * 30, power: 0 },
      L: { value: 200 + i * 60, power: 0 },
    },
  })),
  {
    id: "tech_crystal_armor_1",
    name: "Crystal-Infused Plating",
    kind: "hull",
    tech: "tech_crystal_armor_1",
    approx: true,
    sizes: {
      S: { value: 100, power: 0 },
      M: { value: 200, power: 0 },
      L: { value: 400, power: 0 },
    },
  },
  {
    id: "tech_crystal_armor_2",
    name: "Crystal-Forged Plating",
    kind: "hull",
    tech: "tech_crystal_armor_2",
    approx: true,
    sizes: {
      S: { value: 200, power: 0 },
      M: { value: 400, power: 0 },
      L: { value: 800, power: 0 },
    },
  },
  {
    id: "tech_dragon_armor",
    name: "Artificial Dragonscales",
    kind: "armor",
    tech: "tech_dragon_armor",
    approx: true,
    sizes: {
      S: { value: 150, power: 0 },
      M: { value: 300, power: 0 },
      L: { value: 600, power: 0 },
    },
  },
  {
    id: "tech_archaeoarmor",
    name: "Ancient Pulse Armor",
    kind: "armor",
    tech: "tech_archaeoarmor",
    approx: true,
    archaeo: true,
    sizes: {
      S: { value: 120, power: 0 },
      M: { value: 240, power: 0 },
      L: { value: 480, power: 0 },
    },
  },
];

/* ------------------------------------------------------------------ */
/* Core components                                                     */
/* ------------------------------------------------------------------ */

export interface CoreDef {
  id: string;
  name: string;
  kind: "thruster" | "sensor" | "computer" | "reactor";
  tech: string | null;
  /** thrusters: evasion bonus · sensors: tracking · computers: fire rate · reactors: power */
  value: number;
  /** extra power draw (computers use some) */
  power?: number;
  approx?: boolean;
}

export const CORE_COMPONENTS: CoreDef[] = [
  /* thrusters — evasion & sublight speed (≈) */
  { id: "tech_thrusters_1", name: "Chemical Thrusters", kind: "thruster", tech: "tech_thrusters_1", value: 5, approx: true },
  { id: "tech_thrusters_2", name: "Ion Thrusters", kind: "thruster", tech: "tech_thrusters_2", value: 10, approx: true },
  { id: "tech_thrusters_3", name: "Plasma Thrusters", kind: "thruster", tech: "tech_thrusters_3", value: 15, approx: true },
  { id: "tech_thrusters_4", name: "Impulse Thrusters", kind: "thruster", tech: "tech_thrusters_4", value: 20, approx: true },
  { id: "tech_dark_matter_propulsion", name: "Dark Matter Propulsion", kind: "thruster", tech: "tech_dark_matter_propulsion", value: 30, approx: true },
  /* sensors — tracking (≈) */
  { id: "tech_sensors_2", name: "Gravitic Sensors", kind: "sensor", tech: "tech_sensors_2", value: 10, approx: true },
  { id: "tech_sensors_3", name: "Subspace Sensors", kind: "sensor", tech: "tech_sensors_3", value: 15, approx: true },
  { id: "tech_sensors_4", name: "Tachyon Sensors", kind: "sensor", tech: "tech_sensors_4", value: 20, approx: true },
  /* combat computers (≈) */
  { id: "tech_combat_computers_1", name: "Specialized Combat Computer", kind: "computer", tech: "tech_combat_computers_1", value: 0, power: 5, approx: true },
  { id: "tech_combat_computers_2", name: "Extended Combat Algorithms", kind: "computer", tech: "tech_combat_computers_2", value: 0.05, power: 10, approx: true },
  { id: "tech_combat_computers_3", name: "Sapient Combat Simulations", kind: "computer", tech: "tech_combat_computers_3", value: 0.1, power: 15, approx: true },
  { id: "tech_combat_computers_autonomous", name: "Autonomous Ship Intellects", kind: "computer", tech: "tech_combat_computers_autonomous", value: 0.1, power: 15, approx: true },
  /* reactors — power (≈) */
  { id: "tech_fission_power", name: "Fission Reactor", kind: "reactor", tech: "tech_fission_power", value: 60, approx: true },
  { id: "tech_fusion_power", name: "Fusion Reactor", kind: "reactor", tech: "tech_fusion_power", value: 90, approx: true },
  { id: "tech_cold_fusion_power", name: "Cold Fusion Reactor", kind: "reactor", tech: "tech_cold_fusion_power", value: 120, approx: true },
  { id: "tech_antimatter_power", name: "Antimatter Reactor", kind: "reactor", tech: "tech_antimatter_power", value: 160, approx: true },
  { id: "tech_zero_point_power", name: "Zero Point Reactor", kind: "reactor", tech: "tech_zero_point_power", value: 220, approx: true },
];

/* ------------------------------------------------------------------ */
/* Hulls                                                               */
/* ------------------------------------------------------------------ */

export type ShipClassId =
  | "corvette"
  | "destroyer"
  | "cruiser"
  | "battleship"
  | "titan"
  | "juggernaut";

export interface SectionOption {
  name: string;
  weapons: SlotSize[];
  defense: ("S" | "M" | "L")[];
}

export interface HullSection {
  pos: string;
  any: SectionOption;
  /** section variant used for the given trait */
  offence?: SectionOption;
  defence?: SectionOption;
}

export interface HullDef {
  id: ShipClassId;
  name: string;
  /** tech required to build this class (null = starting hull) */
  tech: string | null;
  hull: number;
  evasion: number;
  /** base sublight speed (≈) */
  speed: number;
  /** base power output (≈) */
  power: number;
  sections: HullSection[];
  desc: string;
}

export const HULLS: HullDef[] = [
  {
    id: "corvette",
    name: "Corvette",
    tech: "tech_corvettes",
    hull: 300,
    evasion: 30,
    speed: 4.6,
    power: 90,
    sections: [
      { pos: "Bow", any: { name: "Gun Bow", weapons: ["S", "S"], defense: ["S"] } },
      { pos: "Stern", any: { name: "Engine Stern", weapons: ["S"], defense: ["S", "S"] } },
    ],
    desc: "Small, fast escort — high evasion, torpedo-capable.",
  },
  {
    id: "destroyer",
    name: "Destroyer",
    tech: "tech_destroyers",
    hull: 700,
    evasion: 20,
    speed: 4.0,
    power: 150,
    sections: [
      {
        pos: "Bow",
        any: { name: "Gun Bow", weapons: ["S", "S", "S"], defense: [] },
        defence: { name: "Picket Bow", weapons: ["S", "P", "P"], defense: [] },
      },
      { pos: "Stern", any: { name: "Gun Stern", weapons: ["M"], defense: ["M", "M"] } },
    ],
    desc: "Escort hunter — the picket bow covers the fleet against missiles and strike craft.",
  },
  {
    id: "cruiser",
    name: "Cruiser",
    tech: "tech_cruisers",
    hull: 1500,
    evasion: 10,
    speed: 3.6,
    power: 240,
    sections: [
      { pos: "Bow", any: { name: "Gun Bow", weapons: ["M", "S"], defense: ["M"] } },
      { pos: "Core", any: { name: "Broadside Core", weapons: ["M", "M"], defense: ["M", "M"] } },
      {
        pos: "Stern",
        any: { name: "Gun Stern", weapons: ["M"], defense: ["M", "M"] },
        offence: { name: "Torpedo Stern", weapons: ["M", "G"], defense: ["M"] },
      },
    ],
    desc: "Versatile line ship — broadsides, carriers or torpedo ambushes.",
  },
  {
    id: "battleship",
    name: "Battleship",
    tech: "tech_battleships",
    hull: 3000,
    evasion: 5,
    speed: 3.2,
    power: 360,
    sections: [
      { pos: "Bow", any: { name: "Spinal Mount Bow", weapons: ["X"], defense: ["M", "M"] } },
      {
        pos: "Core",
        any: { name: "Artillery Core", weapons: ["L", "L"], defense: ["M", "M"] },
        defence: { name: "Carrier Core", weapons: ["M", "M", "H", "H"], defense: ["M", "M"] },
      },
      { pos: "Stern", any: { name: "Artillery Stern", weapons: ["L"], defense: ["L", "L"] } },
    ],
    desc: "Heavy artillery platform — spinal X weapon plus long-range L batteries.",
  },
  {
    id: "titan",
    name: "Titan",
    tech: "tech_titans",
    hull: 10000,
    evasion: 0,
    speed: 2.8,
    power: 500,
    sections: [
      { pos: "Bow", any: { name: "Titan Bow", weapons: ["T"], defense: ["L"] } },
      { pos: "Core", any: { name: "Titan Core", weapons: ["L", "L", "L"], defense: ["L", "L", "L"] } },
      { pos: "Stern", any: { name: "Titan Stern", weapons: ["L", "L"], defense: ["L", "L"] } },
    ],
    desc: "Fleet flagship — one titanic Perdition Beam plus heavy L batteries.",
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    tech: "tech_juggernaut",
    hull: 6000,
    evasion: 0,
    speed: 3.0,
    power: 600,
    sections: [
      { pos: "Bow", any: { name: "Spinal Bow", weapons: ["X", "X"], defense: ["L", "L"] } },
      { pos: "Stern", any: { name: "Foundry Stern", weapons: ["L", "L"], defense: ["L", "L"] } },
    ],
    desc: "Mobile shipyard and fortress — repairs and builds whole fleets on campaign.",
  },
];

/* ------------------------------------------------------------------ */
/* Design generation                                                   */
/* ------------------------------------------------------------------ */

export interface SlotAssignment {
  slot: SlotSize;
  kind: "weapon" | "defense";
  weapon?: WeaponDef;
  defense?: DefenseDef;
}

export interface ShipStats {
  /** aggregated weapon damage per day, before doctrine */
  dps: number;
  /** dps × doctrine fire rate */
  dpsDoctrined: number;
  /** weighted average weapon range */
  avgRange: number;
  shields: number;
  armor: number;
  hull: number;
  evasion: number;
  speed: number;
  powerUsed: number;
  powerAvailable: number;
  /** fire-rate multiplier from the War Doctrine policy */
  doctrineFireRate: number;
  /** range multiplier from the War Doctrine policy */
  doctrineRange: number;
  speedMult: number;
  /** stats contain approximations (≈) */
  approx: boolean;
}

export interface ShipDesign {
  hull: HullDef;
  trait: ShipTrait;
  sections: { pos: string; option: SectionOption; slots: SlotAssignment[] }[];
  cores: CoreDef[];
  stats: ShipStats;
  /** techs that would upgrade this design (better components exist) */
  powerOverflow: boolean;
}

/** energy share of S/M/L weapon slots per trait */
const ENERGY_SHARE: Record<ShipTrait, number> = {
  offence: 0.6,
  balanced: 0.5,
  defence: 0.4,
};

const dpsOf = (w: WeaponDef, size: SlotSize): number => {
  const s = w.sizes[size];
  return s ? s.avg / s.cd : 0;
};

const bestOf = <T,>(list: T[], score: (x: T) => number): T | null => {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const x of list) {
    const s = score(x);
    if (s > bestScore) {
      best = x;
      bestScore = s;
    }
  }
  return best;
};

/** damage multiplier from damage perks (slot-size aware) */
const perkDamageMult = (
  w: WeaponDef,
  size: SlotSize,
  perks: ReadonlySet<string>,
): number => {
  let m = 1;
  if (perks.has("mechromancy") && (size === "L" || size === "X" || size === "T")) {
    m *= 1.15;
  }
  if (perks.has("archaeo_engineers") && w.archaeo) m *= 1.33;
  return m;
};

export function generateDesign(
  hull: HullDef,
  trait: ShipTrait,
  acquired: ReadonlySet<string>,
  policies: PolicyConfig | null,
  perks: ReadonlySet<string>,
): ShipDesign {
  const have = (tech: string | null) => tech == null || acquired.has(tech);

  /* War Doctrine policy multipliers (exact 4.5 values from empireExtras) */
  const doctrineDef = WAR_DOCTRINES.find(
    (d) => d.id === policies?.warDoctrine && d.id !== "none",
  );
  const doctrine = {
    fireRate: doctrineDef?.fireRate ?? 1,
    range: doctrineDef?.weaponsRange ?? 1,
    speed: doctrineDef?.sublightSpeed ?? 1,
  };

  /* ---------- weapons ---------- */
  const energyShare = ENERGY_SHARE[trait];
  const sections = hull.sections.map((sec) => {
    const option = (trait === "offence" && sec.offence) || (trait === "defence" && sec.defence) || sec.any;
    const slots: SlotAssignment[] = [];
    let smi = 0; // running index over S/M/L weapon slots for the class mix
    for (const size of option.weapons) {
      if (size === "P") {
        const candidates = WEAPONS.filter((w) => w.sizes.P && have(w.tech));
        const best = bestOf(candidates, (w) => dpsOf(w, "P"));
        slots.push({ slot: "P", kind: "weapon", weapon: best ?? undefined });
        continue;
      }
      if (size === "G") {
        const candidates = WEAPONS.filter((w) => w.sizes.G && have(w.tech));
        const best = bestOf(candidates, (w) => dpsOf(w, "G"));
        slots.push({ slot: "G", kind: "weapon", weapon: best ?? undefined });
        continue;
      }
      if (size === "H") {
        const candidates = WEAPONS.filter((w) => w.sizes.H && have(w.tech));
        const best = bestOf(candidates, (w) => dpsOf(w, "H"));
        slots.push({ slot: "H", kind: "weapon", weapon: best ?? undefined });
        continue;
      }
      if (size === "T") {
        const candidates = WEAPONS.filter((w) => w.sizes.T && have(w.tech));
        const best = bestOf(candidates, (w) => dpsOf(w, "T"));
        slots.push({ slot: "T", kind: "weapon", weapon: best ?? undefined });
        continue;
      }
      if (size === "X") {
        const candidates = WEAPONS.filter((w) => w.sizes.X && have(w.tech));
        const best = bestOf(candidates, (w) => dpsOf(w, "X") * perkDamageMult(w, "X", perks));
        slots.push({ slot: "X", kind: "weapon", weapon: best ?? undefined });
        continue;
      }
      // S / M / L: mix kinetic (shield-stripping) and energy (armor-breaking)
      // per the trait's energy share — kinetic opens, energy finishes
      const energy = WEAPONS.filter(
        (w) => w.cls === "energy" && !w.penetrating && w.sizes[size] && have(w.tech),
      );
      const kinetic = WEAPONS.filter(
        (w) => w.cls === "kinetic" && w.sizes[size] && have(w.tech),
      );
      const bestEnergy = bestOf(energy, (w) => dpsOf(w, size));
      const bestKinetic = bestOf(kinetic, (w) => dpsOf(w, size));
      /* deterministic class mix: slot i is energy while the running energy
         count stays below the trait's share of filled slots */
      const useEnergy =
        bestKinetic == null
          ? true
          : bestEnergy == null
            ? false
            : Math.floor((smi + 1) * energyShare) > Math.floor(smi * energyShare);
      const chosen = useEnergy ? (bestEnergy ?? bestKinetic) : (bestKinetic ?? bestEnergy);
      slots.push({ slot: size, kind: "weapon", weapon: chosen ?? undefined });
      smi += 1;
    }

    /* ---------- defense slots ---------- */
    const armorShare =
      policies?.defense === "shield" ? 0.25 : policies?.defense === "armor" ? 0.75 : 0.5;
    option.defense.forEach((size, i) => {
      const shields = DEFENSES.filter((d) => d.kind === "shield" && d.sizes[size] && have(d.tech));
      const armors = DEFENSES.filter(
        (d) => (d.kind === "armor" || d.kind === "hull") && d.sizes[size] && have(d.tech),
      );
      const bestShield = bestOf(shields, (d) => d.sizes[size]!.value);
      const bestArmor = bestOf(armors, (d) => d.sizes[size]!.value);
      const useShield =
        bestArmor == null ? true : bestShield == null ? false : i < option.defense.length * (1 - armorShare);
      slots.push({
        slot: size,
        kind: "defense",
        defense: (useShield ? bestShield : bestArmor) ?? bestShield ?? bestArmor ?? undefined,
      });
    });

    return { pos: sec.pos, option, slots };
  });

  /* ---------- core components ---------- */
  const cores: CoreDef[] = [];
  for (const kind of ["reactor", "thruster", "sensor", "computer"] as const) {
    const candidates = CORE_COMPONENTS.filter((c) => c.kind === kind && have(c.tech));
    const best =
      kind === "computer"
        ? // sapient > autonomous > algorithms > specialized: pick last researched tier
          candidates[candidates.length - 1] ?? null
        : bestOf(candidates, (c) => c.value);
    if (best) cores.push(best);
  }

  /* ---------- stats ---------- */
  let dps = 0;
  let dpsWeightedRange = 0;
  let powerUsed = 0;
  let shields = 0;
  let armor = 0;
  let plating = 0;
  let approx = false;
  for (const sec of sections) {
    for (const s of sec.slots) {
      if (s.kind === "weapon" && s.weapon) {
        const st = s.weapon.sizes[s.slot]!;
        dps += dpsOf(s.weapon, s.slot) * perkDamageMult(s.weapon, s.slot, perks);
        dpsWeightedRange += dpsOf(s.weapon, s.slot) * st.range;
        powerUsed += st.power;
        if (s.weapon.approx) approx = true;
      } else if (s.kind === "defense" && s.defense) {
        const st = s.defense.sizes[s.slot as "S" | "M" | "L"]!;
        if (s.defense.kind === "shield") shields += st.value;
        else if (s.defense.kind === "armor") armor += st.value;
        else plating += st.value;
        powerUsed += st.power;
        if (s.defense.approx) approx = true;
      }
    }
  }
  const reactor = cores.find((c) => c.kind === "reactor");
  const thruster = cores.find((c) => c.kind === "thruster");
  const computer = cores.find((c) => c.kind === "computer");
  powerUsed += computer?.power ?? 0;
  if (reactor?.approx || thruster?.approx) approx = true;

  const fireRate = doctrine.fireRate;
  const rangeMult = doctrine.range;

  const stats: ShipStats = {
    dps,
    dpsDoctrined: dps * fireRate,
    avgRange: dps > 0 ? (dpsWeightedRange / dps) * rangeMult : 0,
    shields,
    armor,
    hull: hull.hull + plating,
    evasion: hull.evasion + (thruster?.value ?? 0),
    speed: hull.speed * doctrine.speed * (1 + (thruster ? thruster.value / 100 : 0)),
    powerUsed,
    powerAvailable: hull.power + (reactor?.value ?? 0),
    doctrineFireRate: fireRate,
    doctrineRange: rangeMult,
    speedMult: doctrine.speed,
    approx,
  };

  return {
    hull,
    trait,
    sections,
    cores,
    stats,
    powerOverflow: powerUsed > hull.power + (reactor?.value ?? 0),
  };
}

/** hulls the user can currently build (tech researched) */
export function unlockedHulls(acquired: ReadonlySet<string>): HullDef[] {
  return HULLS.filter((h) => h.tech == null || acquired.has(h.tech));
}
