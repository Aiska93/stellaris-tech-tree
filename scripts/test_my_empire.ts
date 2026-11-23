/* Sanity tests for the My Empire lock + odds model — run with: bun scripts/test_my_empire.ts */
import {
  computeEmpireLocks,
  computeOdds,
  conditionalStartReasons,
  configFromEmpire,
  empireWeightInfo,
  factsFromConfig,
  permanentStartKeys,
  pseudoEmpireFromConfig,
  startTechNote,
  tierGateDependents,
  tierGateInfo,
  type MyEmpireConfig,
} from "../src/lib/myEmpire";
import {
  TECHS,
  TECH_BY_KEY,
  CONDITIONAL_START_TECH_KEYS,
  UNIVERSAL_START_TECH_KEYS,
} from "../src/lib/techtree";
import { generateEmpires } from "../src/lib/empireGen";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures += 1;
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const base: MyEmpireConfig = {
  name: "Test",
  authority: "democratic",
  ethics: [],
  civics: [],
  origin: "prosperous_unification",
  speciesClass: "humanoid",
  traits: [],
  homeworld: "Continental",
  bioShip: false,
  traditions: [],
  policies: {
    warDoctrine: "none",
    researchFocus: { physics: "general", society: "general", engineering: "general" },
    restrictions: "none",
    defense: "balanced",
  },
  perks: [],
};
const cfg = (patch: Partial<MyEmpireConfig>): MyEmpireConfig => ({ ...base, ...patch });

console.log("— lock rules —");

// machine empire: psionics + food + bio ships locked, machine techs open
const machine = factsFromConfig(cfg({ authority: "machine", speciesClass: "machine", traits: ["mechanical"] }));
const machineLocks = computeEmpireLocks(machine);
check("machine: psionic theory locked", machineLocks.get("tech_psionic_theory") != null);
check("machine: zro distillation locked (Psionics cat)", machineLocks.get("tech_mine_zro") != null);
check("machine: eco simulation locked", machineLocks.get("tech_eco_simulation") != null);
check("machine: food processing locked", machineLocks.get("tech_food_processing_1") != null);
check("machine: artificial breeding locked", machineLocks.get("tech_alien_cloning") != null);
check("machine: gloom spores (bio ship) locked", machineLocks.get("tech_weaver_bio_confuser_1") != null);
check("machine: mauler growth locked", machineLocks.get("tech_mauler_growth_1") != null);
check("machine: machine template system OPEN", !machineLocks.has("tech_robomodding_m"));
check("machine: mega-assembly OPEN", !machineLocks.has("tech_mega_assembly"));
check("machine: genome mapping OPEN", !machineLocks.has("tech_genome_mapping"));
check("machine: robotics NOT in machine-only list", !machineLocks.has("tech_robotic_workers"));

// organic non-spiritualist: psionics locked, machine techs locked
const organic = factsFromConfig(cfg({}));
const organicLocks = computeEmpireLocks(organic);
check("organic: psionics locked (no spiritualist)", organicLocks.get("tech_psionic_theory") != null);
check("organic: machine worlds locked", organicLocks.get("tech_robomodding_m") != null);
check("organic: node culling locked", organicLocks.get("tech_node_culling_1") != null);
check("organic: living state locked (gestalt only)", organicLocks.get("tech_living_state") != null);
check("organic: eco simulation OPEN", !organicLocks.has("tech_eco_simulation"));

// spiritualist organic: psionics open
const spiritualist = factsFromConfig(cfg({ ethics: ["spiritualist_f"] }));
check("fanatic spiritualist: psionic theory OPEN", !computeEmpireLocks(spiritualist).has("tech_psionic_theory"));

// teachers of the shroud origin: psionics open even without the ethic
const shroudTeacher = factsFromConfig(cfg({ origin: "teachers_of_shroud", traits: ["latent_psionic"] }));
check("teachers of the shroud: psionics OPEN", !computeEmpireLocks(shroudTeacher).has("tech_psionic_theory"));

// hive: psionics locked, machine techs locked, bio ships need the ship set
const hive = factsFromConfig(cfg({ authority: "hive", civics: ["hive_mind"] }));
const hiveLocks = computeEmpireLocks(hive);
check("hive: psionics locked", hiveLocks.get("tech_psionic_theory") != null);
check("hive: machine template locked", hiveLocks.has("tech_robomodding_m"));
check("hive: weavers locked without the bio-ship set", hiveLocks.get("tech_weavers") != null);
check("hive: living state OPEN (gestalt)", !hiveLocks.has("tech_living_state"));
check("hive: synaptic structures OPEN (hive)", !hiveLocks.has("tech_hive_node"));

// lithoid: food locked, bio-reactor boosted
const lithoid = factsFromConfig(cfg({ speciesClass: "lithoid", traits: ["lithoid"] }));
const lithoidLocks = computeEmpireLocks(lithoid);
check("lithoid: gene crops locked", lithoidLocks.get("tech_gene_crops") != null);
check("lithoid: bio-reactor OPEN", !lithoidLocks.has("tech_bio_reactor"));
check(
  "lithoid: bio-reactor ×20 weight",
  empireWeightInfo(lithoid, TECH_BY_KEY.get("tech_bio_reactor")!).mult === 20,
);

// no empire applied: requirements are checked against a generic organic empire
const defaultLocks = computeEmpireLocks(null);
check(
  "no empire: psionic theory locked (generic baseline)",
  defaultLocks.get("tech_psionic_theory") != null,
);
check(
  "no empire: machine template system locked",
  defaultLocks.get("tech_robomodding_m") != null,
);
check(
  "no empire: weavers locked (needs the bio-ship set)",
  defaultLocks.get("tech_weavers") != null,
);
check(
  "no empire: synaptic structures locked (needs Hive Mind)",
  defaultLocks.get("tech_hive_node") != null,
);
check(
  "no empire: fruit gardens locked (needs Fruitful Partnership)",
  defaultLocks.get("tech_critter_feeder") != null,
);
check(
  "no empire: centers of being locked (needs Wilderness)",
  defaultLocks.get("tech_wilderness_node") != null,
);
check("no empire: eco simulation OPEN (organic food)", !defaultLocks.has("tech_eco_simulation"));
check("no empire: corvettes never locked", !defaultLocks.has("tech_corvettes"));

console.log("— empire-conditional starting techs —");

check(
  "weavers is NOT a universal starting tech",
  !UNIVERSAL_START_TECH_KEYS.has("tech_weavers"),
);
check(
  "weavers IS a conditional starting tech",
  CONDITIONAL_START_TECH_KEYS.has("tech_weavers"),
);
check(
  "corvettes IS a universal starting tech",
  UNIVERSAL_START_TECH_KEYS.has("tech_corvettes"),
);
check(
  "bio-reactor stays universal (user request)",
  UNIVERSAL_START_TECH_KEYS.has("tech_bio_reactor"),
);

// no empire applied: only the universal set is permanent
const noEmpirePermanent = permanentStartKeys(null);
check(
  "no empire: weavers NOT permanently researched",
  !noEmpirePermanent.has("tech_weavers"),
);
check(
  "no empire: hive node NOT permanently researched",
  !noEmpirePermanent.has("tech_hive_node"),
);
check(
  "no empire: hydroponics permanently researched",
  noEmpirePermanent.has("tech_hydroponics"),
);

// plain organic empire (no bio-ship set): weavers stays a normal tech
const plainPermanent = permanentStartKeys(organic);
check(
  "plain empire: weavers NOT permanent",
  !plainPermanent.has("tech_weavers"),
);

// bio-ship empire: the weaver line becomes permanently researched
const bioShipFacts = factsFromConfig(cfg({ bioShip: true }));
const bioShipPermanent = permanentStartKeys(bioShipFacts);
const bioShipLocks = computeEmpireLocks(bioShipFacts);
check("bio-ship empire: weavers permanent", bioShipPermanent.has("tech_weavers"));
check("bio-ship empire: maulers permanent", bioShipPermanent.has("tech_maulers"));
check(
  "bio-ship empire: vector lock cannon permanent",
  bioShipPermanent.has("tech_weaver_bio_anti_evasion_1"),
);
check(
  "bio-ship empire: energy burster permanent",
  bioShipPermanent.has("tech_weaver_bio_evasion_1"),
);
check(
  "bio-ship empire: harbingers still a normal tech",
  !bioShipPermanent.has("tech_harbingers"),
);
check("bio-ship empire: weavers NOT locked", !bioShipLocks.has("tech_weavers"));
check(
  "bio-ship empire: growth chamber NOT locked",
  !bioShipLocks.has("tech_growth_chamber_1"),
);
check(
  "plain empire: growth chamber locked (bio-ship line)",
  computeEmpireLocks(organic).get("tech_growth_chamber_1") != null,
);
check(
  "plain empire: controlled mutations stay open (fauna, not bio-ship)",
  !computeEmpireLocks(organic).has("tech_controlled_mutations"),
);

// machines can never use the bio-ship set even if the flag is set
const machineBioShip = factsFromConfig(cfg({ authority: "machine", speciesClass: "machine", bioShip: true }));
check(
  "machine + bioShip flag: weavers still NOT permanent",
  !permanentStartKeys(machineBioShip).has("tech_weavers"),
);

// hive mind: synaptic structures permanent
check(
  "hive: synaptic structures permanent",
  permanentStartKeys(hive).has("tech_hive_node"),
);
check(
  "non-hive: synaptic structures NOT permanent",
  !plainPermanent.has("tech_hive_node"),
);

// wilderness origin (hive): centers of being + planetary germination
const wildernessFacts = factsFromConfig(cfg({ authority: "hive", origin: "wilderness" }));
const wildernessPermanent = permanentStartKeys(wildernessFacts);
const wildernessLocks = computeEmpireLocks(wildernessFacts);
check(
  "wilderness: centers of being permanent",
  wildernessPermanent.has("tech_wilderness_node"),
);
check(
  "wilderness: planetary germination permanent",
  wildernessPermanent.has("tech_wilderness_terraform"),
);
check(
  "wilderness: centers of being NOT locked",
  !wildernessLocks.has("tech_wilderness_node"),
);
check(
  "wilderness: fruit gardens still locked (different origin)",
  wildernessLocks.get("tech_critter_feeder") != null,
);
check(
  "plain empire: centers of being locked",
  computeEmpireLocks(organic).get("tech_wilderness_node") != null,
);

// fruitful partnership: fruit gardens
const fruitfulFacts = factsFromConfig(cfg({ origin: "fruitful_partnership" }));
check(
  "fruitful partnership: fruit gardens permanent",
  permanentStartKeys(fruitfulFacts).has("tech_critter_feeder"),
);
check(
  "fruitful partnership: fruit gardens NOT locked",
  !computeEmpireLocks(fruitfulFacts).has("tech_critter_feeder"),
);

// reasons + notes
check(
  "startTechNote(weavers) mentions living ships",
  (startTechNote("tech_weavers") ?? "").includes("living ships"),
);
check(
  "startTechNote(corvettes) is universal (null)",
  startTechNote("tech_corvettes") === null,
);
const bioShipReasons = conditionalStartReasons(bioShipFacts);
check(
  "bio-ship reasons list one group with 4 techs",
  bioShipReasons.length === 1 && bioShipReasons[0].names.length === 4,
  JSON.stringify(bioShipReasons),
);
check("no empire: no conditional reasons", conditionalStartReasons(null).length === 0);

console.log("— weight modifiers —");
const xenophile = factsFromConfig(cfg({ ethics: ["xenophile_f"] }));
check(
  "fanatic xenophile: xenology ×3",
  empireWeightInfo(xenophile, TECH_BY_KEY.get("tech_alien_life_studies")!).mult === 3,
);
const auth = factsFromConfig(cfg({ ethics: ["authoritarian"] }));
check(
  "authoritarian: tracking implants ×2",
  empireWeightInfo(auth, TECH_BY_KEY.get("tech_tracking_implants")!).mult === 2,
);
const hiveFacts = hive;
check(
  "hive: cloning ×1.25",
  empireWeightInfo(hiveFacts, TECH_BY_KEY.get("tech_cloning")!).mult === 1.25,
);
const catalytic = factsFromConfig(cfg({ civics: ["catalytic_processing"] }));
check(
  "catalytic: food processing ×2",
  empireWeightInfo(catalytic, TECH_BY_KEY.get("tech_food_processing_1")!).mult === 2,
);
const techno = factsFromConfig(cfg({ civics: ["technocracy"] }));
check("technocracy: 4 research alternatives", techno.alternatives === 4);

console.log("— odds model —");

const allDlcs = new Set(TECHS.map((t) => t.dlc).filter(Boolean) as string[]);
const startingAcquired = new Set<string>(UNIVERSAL_START_TECH_KEYS);

// no empire, fresh save: tier 1 techs drawable, tier 2+ blocked
// (requirements are checked against the generic organic baseline)
const odds0 = computeOdds(startingAcquired, allDlcs, null, defaultLocks);
const sample = odds0.get("tech_fusion_power")!;
check("fresh save: tier-1 tech has odds", sample.pct != null && sample.pct > 0 && sample.drawable);
const t2 = odds0.get("tech_cold_fusion_power")!;
check("fresh save: tier-2 tech blocked (tier gate)", t2.blocked && t2.pct != null);

// regression (user bug): weavers is locked without the bio-ship setting
const weaversOdds = odds0.get("tech_weavers")!;
check(
  "fresh save: weavers locked without the bio-ship set",
  weaversOdds.locked && !weaversOdds.drawable,
  JSON.stringify(weaversOdds),
);
const hiveNodeOdds = odds0.get("tech_hive_node")!;
check(
  "fresh save: synaptic structures locked (needs Hive Mind)",
  hiveNodeOdds.locked && !hiveNodeOdds.drawable,
);
// with a bio-ship empire applied, the weaver line joins the drawable pool
const bioShipOdds = computeOdds(
  startingAcquired,
  allDlcs,
  bioShipFacts,
  computeEmpireLocks(bioShipFacts),
);
check(
  "bio-ship empire: vector lock cannon drawable",
  bioShipOdds.get("tech_weaver_bio_anti_evasion_1")!.drawable,
);

// invariant: sum of drawable pct / alternatives ≈ 100 per area
for (const area of ["physics", "society", "engineering"] as const) {
  let sum = 0;
  for (const t of TECHS.filter((x) => x.area === area && !x.event)) {
    const o = odds0.get(t.key);
    if (o?.drawable) sum += (o.pct ?? 0) / 3;
  }
  check(`${area}: drawable odds sum ≈ 100%`, Math.abs(sum - 100) < 1.5, `got ${sum.toFixed(2)}`);
}

// machine empire: psionic techs locked (pct null), robotics boosted
const machineOdds = computeOdds(startingAcquired, allDlcs, machine, machineLocks);
check("machine odds: psionic theory locked", machineOdds.get("tech_psionic_theory")!.locked);
check(
  "machine odds: robotic workers ×1.25 weight",
  empireWeightInfo(machine, TECH_BY_KEY.get("tech_robotic_workers")!).mult === 1.25,
);

// researching 6 tier-1 society techs unlocks tier 2
const societyT1 = TECHS.filter((t) => t.area === "society" && !t.event && t.tier === 1 && !t.prereqs.length).slice(0, 6);
const moreAcquired = new Set([...startingAcquired, ...societyT1.map((t) => t.key)]);
const odds1 = computeOdds(moreAcquired, allDlcs, null, defaultLocks);
const ecoSim = odds1.get("tech_eco_simulation")!;
check("after 6 tier-1 society techs: eco simulation drawable", ecoSim.drawable);

console.log("— tier gating —");
check(
  "tier 2 gated with only starting techs",
  !tierGateInfo(startingAcquired, "society", 2).unlocked,
);
check(
  "tier 2 needs exactly 6 techs of tier 1",
  tierGateInfo(startingAcquired, "society", 2).need === 6,
);
const gateAfter = tierGateInfo(moreAcquired, "society", 2);
check(
  "tier 2 opens after 6+ tier-1 society techs",
  gateAfter.unlocked && gateAfter.have >= 6,
);
check("tier 1 is always unlocked", tierGateInfo(new Set(), "physics", 1).unlocked);
check(
  "tier 3 still gated with only tier-1 techs researched",
  !tierGateInfo(moreAcquired, "society", 3).unlocked,
);
/* a set with EXACTLY six tier-1 society techs (Bio-Reactor counts as one) */
const sixT1Set = new Set([
  ...startingAcquired,
  ...societyT1.slice(0, 5).map((t) => t.key),
]);
check(
  "exactly-6 set satisfies the tier-2 gate",
  tierGateInfo(sixT1Set, "society", 2).unlocked &&
    tierGateInfo(sixT1Set, "society", 2).have === 6,
);
// unchecking one of the 6 tier-1 techs is fine while no tier-2 tech is researched
check(
  "no tier-2 researched → unchecking a tier-1 tech allowed",
  tierGateDependents(sixT1Set, societyT1[0].key).length === 0,
);
// …but blocked once a tier-2 tech depends on the 6-tech gate
const withT2 = new Set([...sixT1Set, "tech_gene_crops"]); // tech_gene_crops is a tier-2 society tech
const gateDeps = tierGateDependents(withT2, societyT1[0].key);
check(
  "tier gate blocks unchecking the 6th tier-1 tech once tier-2 is researched",
  gateDeps.length > 0 && gateDeps.some((t) => t.key === "tech_gene_crops"),
);
check(
  "tier gate dependents empty for tier-5 techs",
  tierGateDependents(withT2, "tech_eco_simulation").length === 0,
);

console.log("— empire creator bridge —");
const [emp] = generateEmpires({ count: 1, axes: new Set(), dlcs: allDlcs });
const config = configFromEmpire(emp);
const roundTrip = configFromEmpire(pseudoEmpireFromConfig(config));
check(
  "config → pseudo → config round trip stable",
  JSON.stringify(config) === JSON.stringify(roundTrip),
  `${JSON.stringify(config)} vs ${JSON.stringify(roundTrip)}`,
);
const sentLocks = computeEmpireLocks(factsFromConfig(config));
check(
  "sent empire locks are consistent",
  sentLocks.size === computeEmpireLocks(factsFromConfig(config)).size,
);

console.log(
  failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
