/* Sanity tests for the ship design generator — run: bun scripts/test_ships.ts */
import {
  generateDesign,
  HULLS,
  WEAPONS,
  DEFENSES,
  CORE_COMPONENTS,
  unlockedHulls,
  type ShipTrait,
} from "../src/lib/ships";
import { TECHS } from "../src/lib/techtree";

let failures = 0;
const check = (name: string, cond: boolean, extra?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`); }
};

// every referenced tech key must exist in the tech data
const techKeys = new Set(TECHS.map((t) => t.key));
for (const w of WEAPONS) {
  if (w.tech && !techKeys.has(w.tech)) check(`weapon tech exists: ${w.tech} (${w.name})`, false);
}
for (const d of DEFENSES) {
  if (d.tech && !techKeys.has(d.tech)) check(`defense tech exists: ${d.tech} (${d.name})`, false);
}
for (const c of CORE_COMPONENTS) {
  if (c.tech && !techKeys.has(c.tech)) check(`core tech exists: ${c.tech} (${c.name})`, false);
}
console.log("tech key check done");

// all-researched: best-in-slot should be tier-5 weapons on a battleship
const all = new Set(TECHS.map((t) => t.key));
const bb = HULLS.find((h) => h.id === "battleship")!;
for (const trait of ["offence", "defence", "balanced"] as ShipTrait[]) {
  const design = generateDesign(bb, trait, all, null, new Set());
  const names = design.sections.flatMap((s) => s.slots.filter((x) => x.kind === "weapon" && x.weapon).map((x) => x.weapon!.name));
  console.log(`  battleship/${trait}:`, names.join(", "));
  check(`${trait}: X slot filled with a top weapon`, /Tachyon|Giga|Saturator/.test(names.join(",")));
  check(`${trait}: has 3 L weapons`, names.filter((n) => /Laser|Plasma|Artillery|Disintegrator|Gauss/.test(n)).length >= 3);
  check(`${trait}: dps > 100`, design.stats.dps > 100, `dps=${design.stats.dps}`);
  check(`${trait}: shields+armor > 500`, design.stats.shields + design.stats.armor > 500);
  check(`${trait}: reactor present`, design.cores.some((c) => c.kind === "reactor"));
}

// start techs only: corvette gets its basic loadout (Red Laser / Mass Driver)
const startKeys = new Set(TECHS.filter((t) => t.startTech).map((t) => t.key));
const cov = generateDesign(HULLS[0], "balanced", startKeys, null, new Set());
console.log("  fresh corvette:", cov.sections.flatMap((s) => s.slots.map((x) => x.weapon?.name ?? x.defense?.name ?? "—")).join(", "));
check("fresh corvette: sections exist", cov.sections.length === 2);
check("fresh corvette: hull 300", cov.stats.hull === 300);

// war doctrine wiring (exact): No Retreat = ×1.33 fire rate
const nr = generateDesign(bb, "offence", all, { warDoctrine: "no_retreat", researchFocus: { physics: "general", society: "general", engineering: "general" }, restrictions: "none", defense: "balanced" }, new Set());
const plain = generateDesign(bb, "offence", all, null, new Set());
check("No Retreat doctrine: ×1.33 dps", Math.abs(nr.stats.dpsDoctrined / plain.stats.dps - 1.33) < 0.001, `${nr.stats.dpsDoctrined / plain.stats.dps}`);
check("unlocked hulls with start techs = corvette only", unlockedHulls(startKeys).length === 1);
check("unlocked hulls with everything = 6", unlockedHulls(all).length === 6);

// defence trait on destroyer: picket bow variant with P slots
const des = HULLS.find((h) => h.id === "destroyer")!;
const picket = generateDesign(des, "defence", all, null, new Set());
const pSlots = picket.sections.flatMap((s) => s.slots.filter((x) => x.slot === "P"));
check("defence destroyer: picket bow fills 2 P slots", pSlots.length === 2, `got ${pSlots.length}`);

// mechromancy: +15% on L/X/T dps
const mech = generateDesign(bb, "offence", all, null, new Set(["mechromancy"]));
check("Mechromancy +15% dps", Math.abs(mech.stats.dps / plain.stats.dps - 1.15) < 0.001, `${mech.stats.dps / plain.stats.dps}`);

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`);
