/* Sanity tests for the empire generator + editor — run with: bun scripts/test_empire_gen.ts */
import {
  generateEmpires,
  normalizeEmpire,
  changeAuthority,
  changeEthic,
  changeOrigin,
  changeHomeworld,
  changeSpeciesClass,
  renameEmpire,
  toggleCivic,
  toggleTrait,
  traitPointsUsed,
  traitPicksUsed,
  civicPointsUsed,
  ethicPointsUsed,
  mandatoryCivicIds,
  mandatoryTraitIdsOf,
  civicFits,
  originFits,
  traitFits,
  type GeneratedEmpire,
} from "../src/lib/empireGen";
import {
  AXES,
  AUTHORITIES,
  CIVICS,
  CIVIC_POINTS,
  ETHIC_POINTS,
  ETHICS,
  HOMEWORLDS,
  ORIGINS,
  PORTRAIT_TRAIT_IDS,
  SPECIES_CLASSES,
  SPECIES_CLASS_BY_ID,
  TRAITS,
  TRAIT_PICKS,
  TRAIT_POINTS,
} from "../src/lib/empireData";
import type { AxisKey } from "../src/lib/empireData";

const OPPOSITES: [string, string][] = [
  ["militarist", "pacifist"],
  ["xenophobe", "xenophile"],
  ["egalitarian", "authoritarian"],
  ["materialist", "spiritualist"],
];

const ALL = new Set([
  "megacorp", "federations", "overlord", "first_contact", "shroud",
  "machine_age", "cosmic_storms", "grand_archive", "astral_planes",
  "biogenesis", "utopia", "synthetic_dawn", "plantoids", "lithoids",
  "necroids", "aquatics", "toxoids", "under_one_rule", "apocalypse",
]);

let issues = 0;
function fail(msg: string) {
  console.log("FAIL:", msg);
  issues++;
}

/* ------------------------------------------------------------------ */
/* generator invariants                                                */
/* ------------------------------------------------------------------ */

for (let round = 0; round < 30; round++) {
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL });
  if (empires.length !== 10) fail(`count ${empires.length}`);
  for (const e of empires) {
    // no opposing ethics
    const axes = e.ethics.map((x) => x.axis);
    for (const [a, b] of OPPOSITES) {
      if (axes.includes(a) && axes.includes(b)) fail(`opposing ethics in ${e.name}: ${axes.join(",")}`);
    }
    // gestalt has no ethics; non-gestalt has 1–2 ethics within 3 points
    if (e.authority.gestalt && e.ethics.length > 0) fail(`gestalt with ethics: ${e.name}`);
    if (!e.authority.gestalt) {
      if (e.ethics.length < 1 || e.ethics.length > 2) fail(`ethics count ${e.ethics.length}: ${e.name}`);
      if (ethicPointsUsed(e) > ETHIC_POINTS) fail(`ethic points ${ethicPointsUsed(e)}: ${e.name}`);
    }
    // budgets
    if (civicPointsUsed(e) > CIVIC_POINTS) fail(`civic points ${civicPointsUsed(e)}: ${e.name}`);
    if (traitPointsUsed(e) > TRAIT_POINTS) fail(`trait points ${traitPointsUsed(e)}: ${e.name}`);
    if (traitPicksUsed(e) > TRAIT_PICKS) fail(`trait picks ${traitPicksUsed(e)}: ${e.name}`);
    // trait cost shape: ±1/±2 for point traits, 0 for class traits
    for (const t of e.traits) {
      if (t.cls && t.cost !== 0) fail(`class trait with cost ${t.cost}: ${t.name}`);
      if (!t.cls && Math.abs(t.cost) > 2) fail(`trait cost ${t.cost} outside ±2: ${t.name}`);
    }
    // mandatory picks present and locked
    const mCiv = mandatoryCivicIds(e);
    for (const id of mCiv) if (!e.civics.some((c) => c.id === id)) fail(`missing mandatory civic ${id}: ${e.name}`);
    const mTr = mandatoryTraitIdsOf(e);
    for (const id of mTr) if (!e.traits.some((t) => t.id === id)) fail(`missing mandatory trait ${id}: ${e.name}`);
    // structural specifics
    if (e.authority.gestalt === "hive" && !e.civics.some((c) => c.id === "hive_mind")) fail(`hive without Hive Mind civic: ${e.name}`);
    if (e.authority.gestalt === "machine") {
      if (!e.civics.some((c) => c.id === "machine_intelligence")) fail(`machine without Machine Intelligence civic: ${e.name}`);
      if (!e.traits.some((t) => t.id === "mechanical")) fail(`machine without Mechanical trait: ${e.name}`);
      const organicLeft = e.traits.find((t) => !t.cls && t.req?.gestalt !== "machine");
      if (organicLeft) fail(`machine with organic trait: ${organicLeft.name}`);
    }
    // origin compatibility
    if (!originFits(e.origin, e.authority.gestalt)) fail(`origin ${e.origin.name} does not fit ${e.authority.name}`);
    // origin-required traits
    if (e.origin.id === "calamitous_birth" && !e.traits.some((t) => t.id === "lithoid")) fail(`Calamitous Birth without Lithoid: ${e.name}`);
    if (e.origin.id === "teachers_of_shroud" && !e.traits.some((t) => t.id === "latent_psionic")) fail(`Teachers of the Shroud without Latent Psionic: ${e.name}`);
    // civics requirement fit + civic required traits
    const ethicsAxes = new Set(e.ethics.map((x) => x.axis));
    for (const c of e.civics) {
      if (!civicFits(c, { gestalt: e.authority.gestalt, corporate: e.authority.corporate, ethicsAxes })) fail(`civic ${c.name} does not fit ${e.name}`);
      for (const tid of c.requiresTraits ?? []) if (!e.traits.some((t) => t.id === tid)) fail(`civic ${c.name} requires missing trait ${tid}`);
    }
    // ratings in range, homeworld set
    for (const ax of AXES) {
      const v = e.ratings[ax.key as AxisKey];
      if (v < 0 || v > 10) fail(`rating out of range ${v}`);
    }
    if (!e.homeworld) fail(`no homeworld: ${e.name}`);
    // species class invariants
    if (!SPECIES_CLASS_BY_ID[e.speciesClass]) fail(`invalid species class ${e.speciesClass}: ${e.name}`);
    const portraitTraits = e.traits.filter((t) => (PORTRAIT_TRAIT_IDS as readonly string[]).includes(t.id));
    if (portraitTraits.length > 1) fail(`multiple portrait traits: ${e.name}`);
    if (e.authority.gestalt === "machine" && e.speciesClass !== "machine")
      fail(`machine authority with ${e.speciesClass} class: ${e.name}`);
    if (e.speciesClass === "machine" && e.authority.gestalt !== "machine")
      fail(`machine class with ${e.authority.name}: ${e.name}`);
    if (e.speciesClass === "lithoid" && !portraitTraits.some((t) => t.id === "lithoid"))
      fail(`lithoid class without Lithoid trait: ${e.name}`);
    if (e.speciesClass === "plantoid" && !portraitTraits.some((t) => t.id === "plantoid"))
      fail(`plantoid class without Plantoid trait: ${e.name}`);
    if (SPECIES_CLASS_BY_ID[e.speciesClass]?.traitId == null && portraitTraits.length > 0)
      fail(`cosmetic class ${e.speciesClass} with portrait trait ${portraitTraits[0].name}: ${e.name}`);
    const clsDlc = SPECIES_CLASS_BY_ID[e.speciesClass]?.dlc;
    if (clsDlc && !ALL.has(clsDlc)) fail(`${e.name} uses class ${e.speciesClass} from disabled DLC ${clsDlc}`);
    // DLC gating
    const allDlcFields = [
      ...e.civics.map((c) => c.dlc), e.origin.dlc,
      ...e.traits.map((t) => t.dlc), e.authority.dlc,
    ].filter(Boolean) as string[];
    for (const d of allDlcFields) if (!ALL.has(d)) fail(`${e.name} uses disabled DLC ${d}`);
  }
}

/* axis-filtered run */
const research = new Set<AxisKey>(["research"]);
for (let round = 0; round < 5; round++) {
  const empires = generateEmpires({ count: 10, axes: research, dlcs: ALL });
  const wrong = empires.filter((e) => e.archetype !== "research");
  console.log(`research-filtered round ${round}: ${10 - wrong.length}/10 match (${wrong.map((w) => w.archetype).join(",") || "all ok"})`);
}

/* no-DLC run (base game only) */
const baseEmpires = generateEmpires({ count: 10, axes: new Set(), dlcs: new Set() });
if (baseEmpires.filter((e) => e.authority.gestalt).length !== 0) fail("base-only run produced gestalts");
if (baseEmpires.some((e) => civicPointsUsed(e) > CIVIC_POINTS)) fail("base-only civic budget exceeded");
if (baseEmpires.some((e) => SPECIES_CLASS_BY_ID[e.speciesClass]?.dlc)) fail("base-only run used a DLC species class");
console.log("base-only run:", baseEmpires.length, "empires;", baseEmpires[0].name);

/* ------------------------------------------------------------------ */
/* seeded generation ("Build from picks")                              */
/* ------------------------------------------------------------------ */

function checkSeedEmpire(e: GeneratedEmpire, tag: string) {
  if (civicPointsUsed(e) > CIVIC_POINTS) fail(`${tag}: civic budget`);
  if (traitPointsUsed(e) > TRAIT_POINTS) fail(`${tag}: trait budget`);
  if (e.authority.gestalt && e.ethics.length > 0) fail(`${tag}: gestalt with ethics`);
  if (!originFits(e.origin, e.authority.gestalt, e.speciesClass)) fail(`${tag}: origin does not fit`);
  for (const c of e.civics) {
    if (!civicFits(c, {
      gestalt: e.authority.gestalt, corporate: e.authority.corporate,
      ethicsAxes: new Set(e.ethics.map((x) => x.axis)), speciesClass: e.speciesClass,
    })) fail(`${tag}: civic ${c.name} does not fit`);
  }
}

/* -- seed: species class only -- */
for (const [classId, traitId] of [
  ["lithoid", "lithoid"],
  ["plantoid", "plantoid"],
  ["humanoid", null],
  ["fungoid", null],
] as [string, string | null][]) {
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { speciesClass: classId } });
  for (const e of empires) {
    checkSeedEmpire(e, `class ${classId}`);
    if (e.speciesClass !== classId) fail(`class seed ${classId} produced ${e.speciesClass}`);
    if (traitId) {
      if (!e.traits.some((t) => t.id === traitId)) fail(`class seed ${classId} missing trait`);
      if (!mandatoryTraitIdsOf(e).has(traitId)) fail(`class seed ${classId} trait not locked`);
    } else {
      if (e.traits.some((t) => (PORTRAIT_TRAIT_IDS as readonly string[]).includes(t.id)))
        fail(`cosmetic seed ${classId} got a portrait trait`);
      if (e.origin.id === "calamitous_birth") fail(`cosmetic seed ${classId} got Calamitous Birth`);
      if (e.civics.some((c) => c.requiresTraits?.length)) fail(`cosmetic seed ${classId} got a trait-locked civic`);
    }
  }
}

/* -- seed: machine species (authority follows) -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { speciesClass: "machine" } });
  for (const e of empires) {
    checkSeedEmpire(e, "machine seed");
    if (e.authority.gestalt !== "machine") fail(`machine seed got ${e.authority.name}`);
    if (e.speciesClass !== "machine") fail("machine seed class broken");
    if (!e.traits.some((t) => t.id === "mechanical")) fail("machine seed missing Mechanical");
    if (e.traits.some((t) => !t.cls && t.req?.gestalt !== "machine")) fail("machine seed kept organic traits");
  }
}

/* -- seed: authority only -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { authority: "hive" } });
  for (const e of empires) {
    checkSeedEmpire(e, "hive seed");
    if (e.authority.id !== "hive") fail(`hive seed got ${e.authority.id}`);
    if (e.ethics.length !== 0) fail("hive seed with ethics");
    if (e.speciesClass === "machine") fail("hive seed with machine class");
  }
}

/* -- seed: authority machine → machine class -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { authority: "machine" } });
  for (const e of empires) {
    checkSeedEmpire(e, "authority machine seed");
    if (e.authority.gestalt !== "machine" || e.speciesClass !== "machine") fail("authority machine seed broken");
  }
}

/* -- seed: origin only (machine origin) -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { origin: "resource_consolidation" } });
  for (const e of empires) {
    checkSeedEmpire(e, "origin machine seed");
    if (e.origin.id !== "resource_consolidation") fail(`origin seed broken: ${e.origin.id}`);
    if (e.authority.gestalt !== "machine") fail("resource_consolidation seed not machine");
    if (e.speciesClass !== "machine") fail("resource_consolidation seed not machine class");
    if (e.homeworld !== "Machine World") fail(`resource_consolidation homeworld: ${e.homeworld}`);
  }
}

/* -- seed: origin only (lithoid origin pins the class) -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { origin: "calamitous_birth" } });
  for (const e of empires) {
    checkSeedEmpire(e, "origin lithoid seed");
    if (e.origin.id !== "calamitous_birth") fail(`calamitous seed broken: ${e.origin.id}`);
    if (e.speciesClass !== "lithoid") fail(`calamitous seed class: ${e.speciesClass}`);
    if (!e.traits.some((t) => t.id === "lithoid")) fail("calamitous seed missing Lithoid");
  }
}

/* -- seed: homeworld only (origins that force a different one are skipped) -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { homeworld: "Ocean" } });
  for (const e of empires) {
    checkSeedEmpire(e, "homeworld seed");
    if (e.homeworld !== "Ocean") fail(`homeworld seed broken: ${e.homeworld} (${e.origin.name})`);
  }
}

/* -- seed: machine species + homeworld -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { speciesClass: "machine", homeworld: "Arctic" } });
  for (const e of empires) {
    checkSeedEmpire(e, "machine+arctic seed");
    if (e.authority.gestalt !== "machine") fail("machine+arctic seed not machine");
    if (e.homeworld !== "Arctic") fail(`machine+arctic homeworld: ${e.homeworld}`);
  }
}

/* -- seed: hive origin forces hive authority -- */
{
  const empires = generateEmpires({ count: 10, axes: new Set(), dlcs: ALL, seed: { origin: "tree_of_life" } });
  for (const e of empires) {
    checkSeedEmpire(e, "tree_of_life seed");
    if (e.origin.id !== "tree_of_life") fail(`tree_of_life seed broken: ${e.origin.id}`);
    if (e.authority.gestalt !== "hive") fail("tree_of_life seed not hive");
  }
}

/* ------------------------------------------------------------------ */
/* editing invariants                                                  */
/* ------------------------------------------------------------------ */

function anyOrganic(): GeneratedEmpire {
  for (let i = 0; i < 50; i++) {
    const [e] = generateEmpires({ count: 1, axes: new Set(), dlcs: ALL });
    if (!e.authority.gestalt) return e;
  }
  fail("could not generate an organic empire");
  return generateEmpires({ count: 1, axes: new Set(), dlcs: ALL })[0];
}

/* -- switch authority to Hive Mind: ethics cleared, hive_mind locked -- */
{
  const e0 = anyOrganic();
  const e1 = changeAuthority(e0, "hive", ALL);
  if (e1.authority.id !== "hive") fail("changeAuthority did not switch to hive");
  if (e1.ethics.length !== 0) fail("hive still has ethics");
  if (!e1.civics.some((c) => c.id === "hive_mind")) fail("hive_mind civic not auto-checked");
  const locked = mandatoryCivicIds(e1);
  if (!locked.has("hive_mind")) fail("hive_mind not locked");
  const e2 = toggleCivic(e1, "hive_mind");
  if (!e2.civics.some((c) => c.id === "hive_mind")) fail("locked hive_mind could be unchecked");
  if (civicPointsUsed(e1) > CIVIC_POINTS) fail("hive over civic budget");
}

/* -- switch to Machine: mechanical trait auto-added & locked -- */
{
  const e0 = anyOrganic();
  const e1 = changeAuthority(e0, "machine", ALL);
  if (!e1.traits.some((t) => t.id === "mechanical")) fail("mechanical trait not auto-checked");
  if (!e1.civics.some((c) => c.id === "machine_intelligence")) fail("machine_intelligence civic not auto-checked");
  const e2 = toggleTrait(e1, "mechanical");
  if (!e2.traits.some((t) => t.id === "mechanical")) fail("locked mechanical could be unchecked");
  // organic traits must be gone
  if (e1.traits.some((t) => !t.cls && t.req == null)) fail("machine kept organic traits");
  // switching back releases the machine picks
  const e3 = changeAuthority(e1, "oligarchic", ALL);
  if (e3.traits.some((t) => t.id === "mechanical")) fail("mechanical kept after leaving machine");
  if (e3.civics.some((c) => c.id === "machine_intelligence")) fail("machine_intelligence kept after leaving machine");
  // an organic-class origin (Calamitous Birth → Lithoid) must be swapped out for machines
  const cb = changeOrigin(e0, "calamitous_birth");
  const e4 = changeAuthority(cb, "machine", ALL);
  if (e4.origin.id === "calamitous_birth") fail("machine kept the lithoid-only Calamitous Birth origin");
  if (e4.traits.some((t) => t.id === "lithoid")) fail("machine kept the organic Lithoid class trait");
  if (!originFits(e4.origin, "machine")) fail("machine got an incompatible origin");
}

/* -- ethics cycling: budget + opposites -- */
{
  const e0 = anyOrganic();
  let e = changeEthic(e0, e0.ethics[0]?.axis ?? "militarist");
  // fill up to the cap, then further fanatics must be no-ops
  for (const axis of ["xenophobe", "materialist", "militarist"]) {
    e = changeEthic(e, axis);
    e = changeEthic(e, axis); // → fanatic
  }
  if (ethicPointsUsed(e) > ETHIC_POINTS) fail(`ethic budget exceeded: ${ethicPointsUsed(e)}`);
  // opposites never coexist
  const axes = e.ethics.map((x) => x.axis);
  for (const [a, b] of OPPOSITES) if (axes.includes(a) && axes.includes(b)) fail(`edit produced opposing ethics: ${axes.join(",")}`);
}

/* -- trait budget: cannot overspend -- */
{
  const e0 = anyOrganic();
  let e = e0;
  const positives = TRAITS.filter((t) => !t.cls && t.cost === 2 && t.req == null);
  for (const t of positives) e = toggleTrait(e, t.id);
  if (traitPointsUsed(e) > TRAIT_POINTS) fail(`trait budget exceeded: ${traitPointsUsed(e)}`);
  if (traitPicksUsed(e) > TRAIT_PICKS) fail(`trait picks exceeded: ${traitPicksUsed(e)}`);
}

/* -- civic budget: cannot overspend -- */
{
  const e0 = anyOrganic();
  let e = e0;
  const bigs = CIVICS.filter((c) => c.cost === 2 && civicFits(c, {
    gestalt: null, corporate: false,
    ethicsAxes: new Set(e0.ethics.map((x) => x.axis)),
  }));
  for (const c of [...bigs, ...bigs]) e = toggleCivic(e, c.id);
  if (civicPointsUsed(e) > CIVIC_POINTS) fail(`civic budget exceeded: ${civicPointsUsed(e)}`);
}

/* -- origin switching: portrait-requiring origins need the matching class -- */
{
  // on a lithoid species, Calamitous Birth applies and locks the class trait
  const e0 = changeSpeciesClass(anyOrganic(), "lithoid", ALL);
  const e1 = changeOrigin(e0, "calamitous_birth");
  if (e1.origin.id !== "calamitous_birth") fail("calamitous_birth not applied to a lithoid species");
  if (!e1.traits.some((t) => t.id === "lithoid")) fail("calamitous_birth did not auto-check Lithoid");
  const e2 = toggleTrait(e1, "lithoid");
  if (!e2.traits.some((t) => t.id === "lithoid")) fail("locked Lithoid could be unchecked");

  // a cosmetic-class empire cannot take it — the origin is swapped out
  const cos = changeSpeciesClass(anyOrganic(), "humanoid", ALL);
  const rej = changeOrigin(cos, "calamitous_birth");
  if (rej.origin.id === "calamitous_birth") fail("cosmetic class kept Calamitous Birth");
  if (rej.traits.some((t) => t.id === "lithoid")) fail("cosmetic class gained the Lithoid trait");

  // Idyllic Bloom: plantoid class required, civic auto-locks the trait
  let base = e1;
  for (const c of [...e1.civics]) base = toggleCivic(base, c.id);
  const pb = changeSpeciesClass(base, "plantoid", ALL);
  const e3 = toggleCivic(pb, "idyllic_bloom");
  if (!e3.civics.some((c) => c.id === "idyllic_bloom")) fail("Idyllic Bloom could not be added with spare points");
  if (!e3.traits.some((t) => t.id === "plantoid")) fail("Idyllic Bloom did not auto-check Plantoid");
  // removing the civic keeps the species plantoid — the trait stays locked by the class
  const e4 = toggleCivic(e3, "idyllic_bloom");
  if (!mandatoryTraitIdsOf(e4).has("plantoid")) fail("Plantoid class trait unlocked unexpectedly");
  // ...and switching the class away releases it
  const e5 = changeSpeciesClass(e4, "humanoid", ALL);
  if (e5.traits.some((t) => t.id === "plantoid")) fail("Plantoid kept after leaving the class");
}

/* -- species class switching -- */
{
  // organic → machine: authority follows, mechanical locked, ethics cleared
  const e0 = anyOrganic();
  const e1 = changeSpeciesClass(e0, "machine", ALL);
  if (e1.speciesClass !== "machine") fail("class switch to machine failed");
  if (e1.authority.gestalt !== "machine") fail(`machine class kept ${e1.authority.name}`);
  if (e1.ethics.length !== 0) fail("machine class kept ethics");
  if (!e1.traits.some((t) => t.id === "mechanical")) fail("machine class missing Mechanical");
  if (!mandatoryTraitIdsOf(e1).has("mechanical")) fail("mechanical not locked by machine class");
  const e2 = toggleTrait(e1, "mechanical");
  if (!e2.traits.some((t) => t.id === "mechanical")) fail("machine class mechanical could be unchecked");

  // machine → lithoid: authority leaves machine, lithoid trait added & locked
  const e3 = changeSpeciesClass(e1, "lithoid", ALL);
  if (e3.speciesClass !== "lithoid") fail("class switch to lithoid failed");
  if (e3.authority.gestalt === "machine") fail("lithoid class kept machine authority");
  if (!e3.traits.some((t) => t.id === "lithoid")) fail("lithoid class missing Lithoid trait");
  if (!mandatoryTraitIdsOf(e3).has("lithoid")) fail("lithoid class trait not locked");
  if (e3.traits.some((t) => t.id === "mechanical")) fail("lithoid class kept Mechanical");
  if (e3.authority.gestalt && e3.ethics.length > 0) fail("gestalt with ethics after class switch");

  // cosmetic → cosmetic: no portrait traits at all
  const e4 = changeSpeciesClass(e3, "humanoid", ALL);
  if (e4.speciesClass !== "humanoid") fail("class switch to humanoid failed");
  if (e4.traits.some((t) => (PORTRAIT_TRAIT_IDS as readonly string[]).includes(t.id)))
    fail("humanoid class kept a portrait trait");

  // a lithoid-requiring origin is swapped out when the class no longer matches
  const cb = changeOrigin(anyOrganic(), "calamitous_birth");
  const e5 = changeSpeciesClass(cb, "humanoid", ALL);
  if (e5.origin.id === "calamitous_birth") fail("humanoid class kept Calamitous Birth");
  if (e5.traits.some((t) => t.id === "lithoid")) fail("humanoid class kept the origin's Lithoid");

  // class switching survives normalize (idempotent)
  const again = normalizeEmpire(e3);
  if (again.speciesClass !== "lithoid") fail("normalize changed the species class");
  if (again.traits.some((t) => t.id === "mechanical")) fail("normalize re-added Mechanical");
}

/* -- normalize: legacy saves without a species class derive one -- */
{
  const legacy: GeneratedEmpire = JSON.parse(JSON.stringify(anyOrganic()));
  delete (legacy as Partial<GeneratedEmpire>).speciesClass;
  const e = normalizeEmpire(legacy);
  if (!SPECIES_CLASS_BY_ID[e.speciesClass]) fail(`legacy normalize class invalid: ${e.speciesClass}`);
  // a legacy lithoid trait derives the lithoid class
  const [lith] = generateEmpires({ count: 1, axes: new Set(), dlcs: ALL, seed: { origin: "calamitous_birth" } });
  const lithLegacy: GeneratedEmpire = JSON.parse(JSON.stringify(lith));
  delete (lithLegacy as Partial<GeneratedEmpire>).speciesClass;
  const e2 = normalizeEmpire(lithLegacy);
  if (e2.speciesClass !== "lithoid") fail(`legacy lithoid derived ${e2.speciesClass}`);
  if (e2.origin.id !== "calamitous_birth") fail("legacy lithoid lost its origin");
  // legacy machine saves derive the machine class
  const mech = changeAuthority(anyOrganic(), "machine", ALL);
  const mechLegacy: GeneratedEmpire = JSON.parse(JSON.stringify(mech));
  delete (mechLegacy as Partial<GeneratedEmpire>).speciesClass;
  const e3 = normalizeEmpire(mechLegacy);
  if (e3.speciesClass !== "machine") fail(`legacy machine derived ${e3.speciesClass}`);
}

/* -- homeworld & rename -- */
{
  // use an origin without a forced homeworld so the test is deterministic
  const e0 = changeOrigin(anyOrganic(), "prosperous_unification");
  const e1 = changeHomeworld(e0, "Tundra");
  if (e1.homeworld !== "Tundra") fail("homeworld change failed");
  const e2 = renameEmpire(e0, { name: "Test Empire", species: "Testlings", speciesAdj: "Testian" });
  if (e2.name !== "Test Empire" || e2.species !== "Testlings" || e2.speciesAdj !== "Testian") fail("rename failed");
  const gaia = ORIGINS.find((o) => o.homeworld === "Gaia World")!;
  const e3 = changeOrigin(e0, gaia.id);
  if (e3.homeworld !== "Gaia World") fail("origin-forced homeworld not applied");
  const e4 = changeHomeworld(e3, "Tundra");
  if (e4.homeworld !== "Gaia World") fail("origin-forced homeworld could be overridden");
}

/* -- normalize: legacy empire objects (pre-cost data) survive -- */
{
  const legacy = anyOrganic();
  // simulate an old save: strip costs / flags, keep ids only
  const stripped: GeneratedEmpire = JSON.parse(JSON.stringify(legacy));
  const e = normalizeEmpire(stripped);
  if (e.civics.length !== legacy.civics.length) fail("normalize dropped civics unexpectedly");
  if (civicPointsUsed(e) > CIVIC_POINTS) fail("normalize over civic budget");
  if (traitPointsUsed(e) > TRAIT_POINTS) fail("normalize over trait budget");
  // ratings recomputed and identical (same picks)
  for (const ax of AXES) {
    if (e.ratings[ax.key] !== legacy.ratings[ax.key]) fail(`normalize changed ratings for ${ax.key}`);
  }
}

/* -- traitFits / civicFits sanity -- */
{
  const machine = AUTHORITIES.find((a) => a.id === "machine")!;
  const hive = AUTHORITIES.find((a) => a.id === "hive")!;
  const organic = AUTHORITIES.find((a) => a.id === "democratic")!;
  const mech = TRAITS.find((t) => t.id === "mechanical")!;
  const intel = TRAITS.find((t) => t.id === "intelligent")!;
  if (!traitFits(mech, machine)) fail("mechanical should fit machines");
  if (traitFits(mech, organic)) fail("mechanical should not fit organics");
  if (traitFits(intel, machine)) fail("organic trait should not fit machines");
  if (!traitFits(intel, hive)) fail("organic trait should fit hives");
  const hm = CIVICS.find((c) => c.id === "hive_mind")!;
  if (civicFits(hm, { gestalt: "hive", corporate: false, ethicsAxes: new Set() }) !== true) fail("hive_mind should fit hives");
  if (civicFits(hm, { gestalt: null, corporate: false, ethicsAxes: new Set() })) fail("hive_mind should not fit organics");
  const tol = ORIGINS.find((o) => o.id === "tree_of_life")!;
  if (!originFits(tol, "hive")) fail("tree_of_life should fit hives");
  if (originFits(tol, null)) fail("tree_of_life should not fit organics");
}

/* -- every data entry has sane costs -- */
{
  for (const c of CIVICS) if (c.cost < 0 || c.cost > 2) fail(`civic cost out of range: ${c.name} (${c.cost})`);
  for (const t of TRAITS) {
    if (t.cls && t.cost !== 0) fail(`class trait cost must be 0: ${t.name}`);
    if (!t.cls && (t.cost === 0 || Math.abs(t.cost) > 2)) fail(`point trait cost must be ±1/±2: ${t.name} (${t.cost})`);
  }
  for (const a of AUTHORITIES) {
    for (const id of a.requiresCivics ?? []) if (!CIVICS.some((c) => c.id === id)) fail(`authority ${a.id} requires unknown civic ${id}`);
    for (const id of a.requiresTraits ?? []) if (!TRAITS.some((t) => t.id === id)) fail(`authority ${a.id} requires unknown trait ${id}`);
  }
  for (const o of ORIGINS) for (const id of o.requiresTraits ?? []) if (!TRAITS.some((t) => t.id === id)) fail(`origin ${o.id} requires unknown trait ${id}`);
  for (const c of CIVICS) for (const id of c.requiresTraits ?? []) if (!TRAITS.some((t) => t.id === id)) fail(`civic ${c.id} requires unknown trait ${id}`);
  // ethics data: each axis has a regular and fanatic entry
  for (const [axis] of OPPOSITES) {
    if (!ETHICS.some((e) => e.axis === axis && !e.fanatic)) fail(`missing regular ethic for ${axis}`);
    if (!ETHICS.some((e) => e.axis === axis && e.fanatic)) fail(`missing fanatic ethic for ${axis}`);
  }
}

console.log(issues === 0 ? "ALL CHECKS PASSED" : `${issues} ISSUES FOUND`);
process.exit(issues === 0 ? 0 : 1);
