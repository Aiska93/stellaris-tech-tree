/**
 * Random empire generator + editing logic for the Empire Creator tab.
 * Produces full empires (name, species, ethics, authority, civics, origin,
 * traits, homeworld) plus playstyle ratings and aggregated modifiers, and
 * provides pure edit operations so the user can adjust every pick by hand.
 *
 * Budgets: 5 trait points (±1/±2 per trait, max 5 picks), 3 civic points
 * (0 = mandatory structural, 1–2 = regular), 3 ethic points (1–2 per ethic).
 */

import {
  AUTHORITIES,
  AXES,
  CIVICS,
  CIVIC_POINTS,
  EMPIRE_PATTERNS,
  EMPIRE_PATTERNS_CORPORATE,
  EMPIRE_PATTERNS_HIVE,
  EMPIRE_PATTERNS_MACHINE,
  EMPIRE_PATTERNS_MILITARIST,
  EMPIRE_PATTERNS_SPIRITUALIST,
  EMPIRE_TYPES,
  ETHICS,
  ETHIC_POINTS,
  HOMEWORLDS,
  NAME_ADJ,
  NAME_MID,
  NAME_PLURAL,
  NAME_PREFIX,
  NAME_SUFFIX,
  ORIGINS,
  PORTRAIT_TRAIT_IDS,
  SPECIES_CLASSES,
  SPECIES_CLASS_BY_ID,
  TRAITS,
  TRAIT_PICKS,
  TRAIT_POINTS,
  type AxisKey,
  type Authority,
  type Civic,
  type EthicsEntry,
  type GestaltKind,
  type Origin,
  type Ratings,
  type SpeciesClass,
  type Trait,
} from "@/lib/empireData";

export interface ModifierGroup {
  source: string;
  items: string[];
}

export interface GeneratedEmpire {
  id: string;
  name: string;
  species: string;
  speciesAdj: string;
  /** species class (portrait) id — see SPECIES_CLASSES */
  speciesClass: string;
  archetype: AxisKey;
  ratings: Record<AxisKey, number>; // 0–10 bars
  rawRatings: Record<AxisKey, number>;
  ethics: EthicsEntry[];
  authority: Authority;
  civics: Civic[];
  origin: Origin;
  traits: Trait[];
  homeworld: string;
  summary: string;
  modifiers: ModifierGroup[];
}

export interface GenerateOptions {
  count: number;
  /** selected playstyles; empty = any */
  axes: Set<AxisKey>;
  /** active DLC ids (tree + extra, base game always implicit) */
  dlcs: Set<string>;
  /**
   * User-picked seeds for "Build from picks": every field the user locked
   * (species class, authority, origin, homeworld); anything missing is
   * rolled randomly. At least one field should be set — the UI enforces it.
   */
  seed?: EmpireSeed;
}

export interface EmpireSeed {
  /** SPECIES_CLASSES id */
  speciesClass?: string;
  /** AUTHORITIES id */
  authority?: string;
  /** ORIGINS id */
  origin?: string;
  /** HOMEWORLDS entry */
  homeworld?: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

let uidCounter = 0;
function uid(): string {
  uidCounter += 1;
  return `emp-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** weighted pick: weight fn > 0 to be eligible */
function weighted<T>(arr: readonly T[], weight: (t: T) => number): T {
  const weights = arr.map((t) => Math.max(0.0001, weight(t)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function ratingOn(r: Ratings, axis: AxisKey): number {
  return r[axis] ?? 0;
}

/** opposing ethic axes can never be picked together */
export const ETHIC_OPPOSITES: Record<string, string> = {
  militarist: "pacifist",
  pacifist: "militarist",
  xenophobe: "xenophile",
  xenophile: "xenophobe",
  egalitarian: "authoritarian",
  authoritarian: "egalitarian",
  materialist: "spiritualist",
  spiritualist: "materialist",
};

/* ------------------------------------------------------------------ */
/* structural fit checks (requirements only — DLC handled separately)  */
/* ------------------------------------------------------------------ */

export interface CivicContext {
  gestalt: GestaltKind | null;
  corporate: boolean;
  ethicsAxes: Set<string>;
  /** pinned species class id — portrait-trait civics must match it */
  speciesClass?: string | null;
}

/**
 * Required species traits must match the empire kind (machine vs organic) and,
 * when a species class is pinned, the portrait class trait (Mechanical /
 * Lithoid / Plantoid) must be the one the class provides.
 */
function requiredTraitsFit(
  ids: string[] | undefined,
  gestalt: GestaltKind | null,
  speciesClass?: string | null,
): boolean {
  if (!ids) return true;
  // undefined = class unknown (random generation) → no portrait filter;
  // null-ish classTrait = cosmetic class → no portrait trait allowed
  const classTrait =
    speciesClass === undefined || speciesClass === null
      ? undefined
      : (SPECIES_CLASS_BY_ID[speciesClass]?.traitId ?? null);
  return ids.every((id) => {
    const t = TRAITS.find((x) => x.id === id);
    if (!t) return true;
    if (gestalt === "machine") return t.req?.gestalt === "machine";
    if (t.req?.gestalt === "machine") return false;
    if (
      classTrait !== undefined &&
      (PORTRAIT_TRAIT_IDS as readonly string[]).includes(id) &&
      id !== classTrait
    ) {
      return false;
    }
    return true;
  });
}

export function civicFits(c: Civic, ctx: CivicContext): boolean {
  const req = c.req;
  if (!req)
    return !ctx.gestalt && requiredTraitsFit(c.requiresTraits, ctx.gestalt, ctx.speciesClass); // generic civics are for non-gestalt empires
  if (req.gestalt) return ctx.gestalt === req.gestalt;
  if (req.corporate) return ctx.corporate;
  if (ctx.gestalt) return false; // ethics-locked civics need non-gestalt ethics
  if (req.ethicsAny && !req.ethicsAny.some((a) => ctx.ethicsAxes.has(a)))
    return false;
  return requiredTraitsFit(c.requiresTraits, ctx.gestalt, ctx.speciesClass);
}

export function originFits(
  o: Origin,
  gestalt: GestaltKind | null,
  speciesClass?: string | null,
): boolean {
  if (o.req?.gestalt)
    return gestalt === o.req.gestalt && requiredTraitsFit(o.requiresTraits, gestalt, speciesClass);
  if (o.req?.notGestalt)
    return gestalt === null && requiredTraitsFit(o.requiresTraits, gestalt, speciesClass);
  if (gestalt)
    return (
      o.req === null && requiredTraitsFit(o.requiresTraits, gestalt, speciesClass) // gestalts only get plain origins
    );
  return requiredTraitsFit(o.requiresTraits, null, speciesClass);
}

/** machine empires can only use machine traits; organics everything else */
export function traitFits(t: Trait, authority: Authority): boolean {
  if (authority.gestalt === "machine") return t.req?.gestalt === "machine";
  return !t.req?.gestalt;
}

/* ------------------------------------------------------------------ */
/* mandatory picks: civics/traits an empire needs to exist             */
/* ------------------------------------------------------------------ */

export function mandatoryCivicsFor(authority: Authority): Civic[] {
  return (authority.requiresCivics ?? [])
    .map((id) => CIVICS.find((c) => c.id === id))
    .filter((c): c is Civic => Boolean(c));
}

export function mandatoryTraitIdsFor(
  authority: Authority,
  origin: Origin,
  civics: Civic[],
  speciesClass?: string,
): string[] {
  const ids = new Set<string>([
    ...(authority.requiresTraits ?? []),
    ...(origin.requiresTraits ?? []),
    ...civics.flatMap((c) => c.requiresTraits ?? []),
  ]);
  // the pinned class carries its free class trait (Lithoid / Plantoid / Machine)
  const cls = speciesClass ? SPECIES_CLASS_BY_ID[speciesClass] : undefined;
  if (cls?.traitId) ids.add(cls.traitId);
  return [...ids];
}

export function mandatoryTraitsFor(
  authority: Authority,
  origin: Origin,
  civics: Civic[],
  speciesClass?: string,
): Trait[] {
  return mandatoryTraitIdsFor(authority, origin, civics, speciesClass)
    .map((id) => TRAITS.find((t) => t.id === id))
    .filter((t): t is Trait => Boolean(t));
}

/** locked civic ids for a fully built empire */
export function mandatoryCivicIds(e: GeneratedEmpire): Set<string> {
  return new Set(mandatoryCivicsFor(e.authority).map((c) => c.id));
}

/** locked trait ids for a fully built empire (authority + origin + civics + class) */
export function mandatoryTraitIdsOf(e: GeneratedEmpire): Set<string> {
  return new Set(
    mandatoryTraitIdsFor(e.authority, e.origin, e.civics, e.speciesClass),
  );
}

/* ------------------------------------------------------------------ */
/* name generation                                                     */
/* ------------------------------------------------------------------ */

interface NameContext {
  ethics: EthicsEntry[];
  authority: Authority;
}

function generateSpeciesName(): { plural: string; adj: string } {
  const root = rand(NAME_PREFIX) + rand(NAME_MID) + rand(NAME_SUFFIX);
  const plural = root + rand(NAME_PLURAL);
  const adj = root + rand(NAME_ADJ);
  return { plural, adj };
}

function generateEmpireName(ctx: NameContext, names: { plural: string; adj: string }): string {
  let pool = EMPIRE_PATTERNS;
  if (ctx.authority.gestalt === "hive") pool = EMPIRE_PATTERNS_HIVE;
  else if (ctx.authority.gestalt === "machine") pool = EMPIRE_PATTERNS_MACHINE;
  else if (ctx.authority.corporate) pool = EMPIRE_PATTERNS_CORPORATE;
  else {
    const axes = new Set(ctx.ethics.map((e) => e.axis));
    if (axes.has("spiritualist") && Math.random() < 0.4) pool = EMPIRE_PATTERNS_SPIRITUALIST;
    else if (axes.has("militarist") && Math.random() < 0.4) pool = EMPIRE_PATTERNS_MILITARIST;
  }
  return rand(pool)
    .replace(/%ADJ%/g, names.adj)
    .replace(/%PLURAL%/g, names.plural)
    .replace(/%TYPE%/g, rand(EMPIRE_TYPES))
    .replace(/%N%/g, String(Math.floor(Math.random() * 9000) + 1000));
}

/* ------------------------------------------------------------------ */
/* pools & filters (generator: requirements + DLC)                     */
/* ------------------------------------------------------------------ */

function ethicsAllowed(e: EthicsEntry, target: AxisKey): boolean {
  return ratingOn(e.r, target) > 0;
}

/* ------------------------------------------------------------------ */
/* seeds: resolve + validate the user's locked picks                   */
/* ------------------------------------------------------------------ */

interface ResolvedSeed {
  speciesClass: SpeciesClass | null;
  authority: Authority | null;
  origin: Origin | null;
  homeworld: string | null;
}

function resolveSeed(seed: EmpireSeed | undefined, dlcs: Set<string>): ResolvedSeed {
  const dlcOk = (d: string | null | undefined) => !d || dlcs.has(d);

  let speciesClass: SpeciesClass | null = null;
  if (seed?.speciesClass) {
    const c = SPECIES_CLASS_BY_ID[seed.speciesClass];
    if (c && dlcOk(c.dlc)) speciesClass = c;
  }
  let authority: Authority | null = null;
  if (seed?.authority) {
    const a = AUTHORITIES.find((x) => x.id === seed.authority);
    if (a && dlcOk(a.dlc)) authority = a;
  }
  let origin: Origin | null = null;
  if (seed?.origin) {
    const o = ORIGINS.find((x) => x.id === seed.origin);
    if (o && dlcOk(o.dlc)) origin = o;
  }
  const homeworld =
    seed?.homeworld && (HOMEWORLDS as readonly string[]).includes(seed.homeworld)
      ? seed.homeworld
      : null;

  // the Machine class only exists under a Machine Intelligence — and vice versa
  if (speciesClass?.machine) {
    authority = AUTHORITIES.find((a) => a.gestalt === "machine" && dlcOk(a.dlc)) ?? null;
  } else if (authority?.gestalt === "machine") {
    speciesClass = SPECIES_CLASS_BY_ID.machine;
  }
  // an origin requiring a portrait trait pins the matching class when free
  if (!speciesClass && origin?.requiresTraits) {
    const pt = origin.requiresTraits.find((id) =>
      (PORTRAIT_TRAIT_IDS as readonly string[]).includes(id),
    );
    if (pt) speciesClass = SPECIES_CLASSES.find((c) => c.traitId === pt) ?? null;
  }
  return { speciesClass, authority, origin, homeworld };
}

/**
 * Final species class for a freshly generated empire: machine authority or
 * a portrait class trait decides; plain organics get a random cosmetic
 * portrait class (weighted toward base-game ones).
 */
function deriveSpeciesClass(
  traits: Trait[],
  authority: Authority,
  dlcs: Set<string>,
): SpeciesClass {
  if (authority.gestalt === "machine") return SPECIES_CLASS_BY_ID.machine;
  const ids = new Set(traits.map((t) => t.id));
  if (ids.has("lithoid")) return SPECIES_CLASS_BY_ID.lithoid;
  if (ids.has("plantoid")) return SPECIES_CLASS_BY_ID.plantoid;
  const cosmetic = SPECIES_CLASSES.filter((c) => !c.traitId && !c.machine);
  const unlocked = cosmetic.filter((c) => !c.dlc || dlcs.has(c.dlc));
  const base = unlocked.filter((c) => !c.dlc);
  if (base.length === 0) return rand(unlocked.length > 0 ? unlocked : cosmetic);
  if (unlocked.length > 0 && Math.random() < 0.3) return rand(unlocked);
  return rand(base);
}

/* ------------------------------------------------------------------ */
/* single empire generation                                            */
/* ------------------------------------------------------------------ */

function pickEthics(target: AxisKey): EthicsEntry[] {
  const compatible = ETHICS.filter((e) => !e.fanatic && ethicsAllowed(e, target));
  const notOpposite = (primaryAxis: string) =>
    ETHICS.filter(
      (e) =>
        !e.fanatic &&
        e.axis !== primaryAxis &&
        e.axis !== ETHIC_OPPOSITES[primaryAxis],
    );

  if (compatible.length === 0) {
    // extreme fallback: any non-fanatic pair of non-opposing ethics
    const a = rand(ETHICS.filter((e) => !e.fanatic));
    const rest = notOpposite(a.axis);
    const b = rand(rest);
    return b ? [a, b] : [a];
  }
  if (Math.random() < 0.45) {
    const primary = rand(compatible);
    const fanatic = ETHICS.find(
      (e) => e.fanatic && e.axis === primary.axis,
    )!;
    const others = notOpposite(primary.axis).filter(
      (e) => ratingOn(e.r, target) > 0,
    );
    const secondary = others.length > 0 && Math.random() < 0.75
      ? rand(others)
      : rand(notOpposite(primary.axis));
    return [fanatic, secondary];
  }
  const first = rand(compatible);
  const secondPool = notOpposite(first.axis).filter(
    (e) => ratingOn(e.r, target) > 0,
  );
  const second = secondPool.length > 0
    ? rand(secondPool)
    : rand(notOpposite(first.axis));
  return [first, second];
}

/** pick point-costing traits within 5 points / 5 picks, aligned to `target` */
function pickTraits(
  target: AxisKey,
  dlcs: Set<string>,
  authority: Authority,
  exclude: Set<string>,
): Trait[] {
  const pool = TRAITS.filter(
    (t) =>
      !t.cls &&
      !exclude.has(t.id) &&
      (!t.dlc || dlcs.has(t.dlc)) &&
      traitFits(t, authority),
  );
  const positive = pool.filter((t) => t.cost > 0);
  const negative = pool.filter((t) => t.cost < 0);
  const picked: Trait[] = [];
  const used = new Set<string>();
  let budget = TRAIT_POINTS;
  let picks = 0;

  // 55% chance to take one negative trait to afford more positives
  if (negative.length > 0 && Math.random() < 0.55) {
    const neg = weighted(negative, (t) => 1);
    picked.push(neg);
    used.add(neg.id);
    budget -= neg.cost; // negative cost → budget grows
    picks += 1;
  }

  while (picks < TRAIT_PICKS) {
    const avail = positive.filter((t) => !used.has(t.id) && t.cost <= budget);
    if (avail.length === 0) break;
    const trait = weighted(avail, (t) =>
      ratingOn(t.r, target) > 0 ? 1 + ratingOn(t.r, target) : 0.3,
    );
    picked.push(trait);
    used.add(trait.id);
    budget -= trait.cost;
    picks += 1;
    if (budget <= 0) break;
  }

  // occasionally a second negative if budget and picks remain
  if (budget >= 1 && picks < TRAIT_PICKS && negative.length > 0 && Math.random() < 0.25) {
    const avail = negative.filter((t) => !used.has(t.id));
    if (avail.length > 0) picked.push(weighted(avail, (t) => 1));
  }
  return picked;
}

/** pick civics within 3 points (mandatory civics cost 0 and come free) */
function pickCivics(
  target: AxisKey,
  dlcs: Set<string>,
  ctx: CivicContext,
  mandatory: Civic[],
): Civic[] {
  const mandatoryIds = new Set(mandatory.map((c) => c.id));
  const pool = CIVICS.filter(
    (c) => !mandatoryIds.has(c.id) && (!c.dlc || dlcs.has(c.dlc)) && civicFits(c, ctx),
  );
  const picked = [...mandatory];
  let budget = CIVIC_POINTS;
  let guard = 0;
  while (guard < 40) {
    guard += 1;
    const avail = pool.filter(
      (c) => !picked.some((p) => p.id === c.id) && c.cost <= budget,
    );
    if (avail.length === 0) break;
    const c = weighted(avail, (x) => {
      let w = 0.6 + ratingOn(x.r, target) * 1.4;
      if (x.cost === budget) w += 1.2; // prefer exactly filling the budget
      return w;
    });
    picked.push(c);
    budget -= c.cost;
    if (budget <= 0) break;
  }
  return picked;
}

/* ------------------------------------------------------------------ */
/* derived values (ratings, archetype, summary, modifiers)             */
/* ------------------------------------------------------------------ */

function computeEmpireDerived(core: {
  id: string;
  name: string;
  species: string;
  speciesAdj: string;
  speciesClass: string;
  ethics: EthicsEntry[];
  authority: Authority;
  civics: Civic[];
  origin: Origin;
  traits: Trait[];
  homeworld: string;
}): GeneratedEmpire {
  const { ethics, authority, civics, origin, traits } = core;

  const raw = Object.fromEntries(
    AXES.map((a) => [a.key, 0]),
  ) as Record<AxisKey, number>;
  for (const e of ethics) for (const k of AXES) raw[k.key] += ratingOn(e.r, k.key);
  for (const k of AXES) raw[k.key] += ratingOn(authority.r, k.key);
  for (const c of civics) for (const k of AXES) raw[k.key] += ratingOn(c.r, k.key);
  for (const k of AXES) raw[k.key] += ratingOn(origin.r, k.key);
  for (const t of traits) for (const k of AXES) raw[k.key] += ratingOn(t.r, k.key);

  const ratings = Object.fromEntries(
    AXES.map((a) => [
      a.key,
      Math.max(0, Math.min(10, Math.round((raw[a.key] * 10) / 16))),
    ]),
  ) as Record<AxisKey, number>;

  const archetype = AXES.reduce(
    (best, a) => (raw[a.key] > raw[best.key] ? a : best),
    AXES[0],
  ).key;

  /* summary: top contributors on the archetype axis */
  const contributors: { name: string; score: number }[] = [
    ...ethics.map((e) => ({ name: e.name, score: ratingOn(e.r, archetype) })),
    { name: authority.name, score: ratingOn(authority.r, archetype) },
    ...civics.map((c) => ({ name: c.name, score: ratingOn(c.r, archetype) })),
    { name: `${origin.name} (origin)`, score: ratingOn(origin.r, archetype) },
    ...traits
      .filter((t) => ratingOn(t.r, archetype) > 0)
      .map((t) => ({ name: t.name, score: ratingOn(t.r, archetype) })),
  ]
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const axisMeta = AXES.find((a) => a.key === archetype)!;
  const summary =
    `Best trait: ${axisMeta.label} — ${axisMeta.desc} ` +
    (contributors.length > 0
      ? `Driven by ${contributors.slice(0, 3).map((c) => c.name).join(", ")}.`
      : "");

  /* modifiers */
  const modifiers: ModifierGroup[] = [];
  if (ethics.length > 0) {
    modifiers.push({
      source: "Ethics",
      items: ethics.flatMap((e) => e.mods.map((m) => `${e.name}: ${m}`)),
    });
  }
  modifiers.push({
    source: `Authority — ${authority.name}`,
    items: authority.mods,
  });
  for (const c of civics) {
    modifiers.push({ source: `Civic — ${c.name}`, items: c.mods });
  }
  modifiers.push({ source: `Origin — ${origin.name}`, items: origin.mods });
  if (traits.length > 0) {
    modifiers.push({
      source: "Species Traits",
      items: traits.flatMap((t) => t.mods.map((m) => `${t.name}: ${m}`)),
    });
  }

  return {
    ...core,
    archetype,
    ratings,
    rawRatings: raw,
    summary,
    modifiers,
  };
}

/* ------------------------------------------------------------------ */
/* build + normalize                                                   */
/* ------------------------------------------------------------------ */

function buildEmpire(target: AxisKey, dlcs: Set<string>, seed?: EmpireSeed): GeneratedEmpire {
  const s = resolveSeed(seed, dlcs);

  /* authority & gestalt — the seed wins, otherwise the usual roll */
  let gestalt: GestaltKind | null;
  if (s.authority) gestalt = s.authority.gestalt;
  else if (s.speciesClass?.machine) gestalt = "machine";
  else if (s.origin?.req?.gestalt) gestalt = s.origin.req.gestalt;
  else if (s.speciesClass) {
    // an organic class is pinned — machine empires are always Machine species,
    // so only the hive roll remains possible (e.g. lithoid hives)
    gestalt = dlcs.has("utopia") && Math.random() < 0.125 ? "hive" : null;
  } else {
    const gestaltRoll = Math.random();
    if (dlcs.has("utopia") && gestaltRoll < 0.1) gestalt = "hive";
    else if (dlcs.has("synthetic_dawn") && gestaltRoll >= 0.1 && gestaltRoll < 0.2)
      gestalt = "machine";
    else gestalt = null;
  }

  /* a machine setup and a pinned organic class cannot coexist — species wins */
  let originSeed = s.origin;
  if (gestalt === "machine" && s.speciesClass && !s.speciesClass.machine) {
    gestalt = null;
    originSeed = null;
  }

  let authority: Authority;
  if (s.authority && s.authority.gestalt === gestalt) {
    authority = s.authority;
  } else {
    const authorityPool = AUTHORITIES.filter(
      (a) => (!a.dlc || dlcs.has(a.dlc)) && a.gestalt === gestalt,
    );
    authority =
      authorityPool.length > 0
        ? weighted(authorityPool, (a) => 1 + ratingOn(a.r, target))
        : AUTHORITIES[1];
  }

  /* species class: seeded, or Machine for machine empires, or derived later */
  let speciesClass: SpeciesClass | null = s.speciesClass;
  if (!speciesClass && authority.gestalt === "machine")
    speciesClass = SPECIES_CLASS_BY_ID.machine;
  const classId = speciesClass?.id ?? null;

  /* ethics */
  const ethics = gestalt ? [] : pickEthics(target);
  const ethicsAxes = new Set(ethics.map((e) => e.axis));

  /* origin: seeded origin (if compatible), otherwise a fitting pool.
     Picked BEFORE the civics so a portrait-requiring origin (e.g. Calamitous
     Birth → Lithoid) and a portrait-requiring civic (e.g. Idyllic Bloom →
     Plantoid) can never end up on the same empire. */
  const originOk = (o: Origin) =>
    (!o.dlc || dlcs.has(o.dlc)) && originFits(o, gestalt, classId);
  let origin: Origin;
  if (originSeed && originOk(originSeed)) {
    origin = originSeed;
  } else {
    // with a seeded homeworld, avoid origins that force a different one
    let pool = ORIGINS.filter(
      (o) => originOk(o) && (!s.homeworld || o.homeworld === null),
    );
    if (pool.length === 0) pool = ORIGINS.filter(originOk);
    if (pool.length === 0) pool = ORIGINS.filter((o) => originFits(o, gestalt, null));
    origin = weighted(
      pool.length > 0 ? pool : [ORIGINS[0]],
      (o) => 0.8 + ratingOn(o.r, target) * 1.2,
    );
  }

  /* the class implied by the origin's required portrait trait, if any */
  const impliedClass = (origin.requiresTraits ?? [])
    .map((id) => SPECIES_CLASSES.find((c) => c.traitId === id))
    .find((c): c is SpeciesClass => Boolean(c));

  /* civics: mandatory structural civics come free, then fill 3 points */
  const mandatory = mandatoryCivicsFor(authority);
  const civics = pickCivics(
    target,
    dlcs,
    {
      gestalt,
      corporate: authority.corporate,
      ethicsAxes,
      speciesClass: classId ?? impliedClass?.id ?? null,
    },
    mandatory,
  );

  /* traits: mandatory class/archetype traits first, then point traits */
  const mandatoryTraits = mandatoryTraitsFor(authority, origin, civics, classId ?? undefined);
  const traits = [
    ...mandatoryTraits,
    ...pickTraits(target, dlcs, authority, new Set(mandatoryTraits.map((t) => t.id))),
  ];

  /* unseeded organics occasionally roll a special class (free class trait) */
  if (!speciesClass && authority.gestalt !== "machine" && !traits.some((t) => t.cls)) {
    const classTraits = TRAITS.filter(
      (t) =>
        t.cls &&
        (t.id === "lithoid" || t.id === "plantoid") &&
        (!t.dlc || dlcs.has(t.dlc)),
    );
    if (classTraits.length > 0 && Math.random() < 0.18) traits.push(rand(classTraits));
  }

  /* final species class (seeded, machine, or derived from the traits) */
  const finalClass = speciesClass ?? deriveSpeciesClass(traits, authority, dlcs);

  /* names & homeworld */
  const names = generateSpeciesName();
  const empireName = generateEmpireName({ ethics, authority }, names);
  const homeworld = origin.homeworld ?? s.homeworld ?? rand([...HOMEWORLDS]);

  return computeEmpireDerived({
    id: uid(),
    name: empireName,
    species: names.plural,
    speciesAdj: names.adj,
    speciesClass: finalClass.id,
    ethics,
    authority,
    civics,
    origin,
    traits,
    homeworld,
  });
}

/**
 * Re-resolve a stored empire against the current dataset: refreshes every
 * pick by id, enforces the budgets and requirement rules, auto-checks
 * mandatory civics/traits, and recomputes ratings & modifiers. Used both
 * for legacy localStorage data and after every manual edit.
 */
export function normalizeEmpire(stored: GeneratedEmpire): GeneratedEmpire {
  const authority =
    AUTHORITIES.find((a) => a.id === stored?.authority?.id) ?? AUTHORITIES[1];
  const gestalt = authority.gestalt;

  /* species class: stored → machine override → derived from traits → default */
  let speciesClass =
    stored?.speciesClass && SPECIES_CLASS_BY_ID[stored.speciesClass]
      ? stored.speciesClass
      : null;
  if (gestalt === "machine") speciesClass = "machine";
  else if (speciesClass === "machine") speciesClass = null; // machine class needs the machine authority
  if (!speciesClass) {
    const has = (id: string) => (stored?.traits ?? []).some((t) => t?.id === id);
    speciesClass = has("lithoid") ? "lithoid" : has("plantoid") ? "plantoid" : "humanoid";
  }
  const classTraitId = SPECIES_CLASS_BY_ID[speciesClass]?.traitId ?? null;

  /* ethics: resolve, drop opposites/overflow, clear for gestalts */
  const ethics: EthicsEntry[] = [];
  if (!gestalt) {
    const seen = new Set<string>();
    let pts = 0;
    for (const e of stored?.ethics ?? []) {
      const found = ETHICS.find((x) => x.id === e?.id);
      if (!found) continue;
      if (seen.has(found.axis) || seen.has(ETHIC_OPPOSITES[found.axis])) continue;
      const c = found.fanatic ? 2 : 1;
      if (pts + c > ETHIC_POINTS) continue;
      seen.add(found.axis);
      pts += c;
      ethics.push(found);
    }
  }

  /* origin: resolve; swap to the best-fitting one if it conflicts */
  let origin = ORIGINS.find((o) => o.id === stored?.origin?.id) ?? ORIGINS[0];
  if (!originFits(origin, gestalt, speciesClass)) {
    const target: AxisKey = stored?.archetype ?? "economy";
    origin =
      [...ORIGINS]
        .filter((o) => originFits(o, gestalt, speciesClass))
        .sort((a, b) => ratingOn(b.r, target) - ratingOn(a.r, target))[0] ??
      ORIGINS[0];
  }

  /* civics: resolve, drop unfit, add mandatory, respect 3 points */
  const ethicsAxes = new Set(ethics.map((e) => e.axis));
  const mandatoryCivics = mandatoryCivicsFor(authority);
  const mandatoryCivicIdSet = new Set(mandatoryCivics.map((c) => c.id));
  const civics: Civic[] = [...mandatoryCivics];
  let civicBudget = CIVIC_POINTS;
  for (const c of stored?.civics ?? []) {
    const found = CIVICS.find((x) => x.id === c?.id);
    if (!found || mandatoryCivicIdSet.has(found.id)) continue;
    if (civics.some((p) => p.id === found.id)) continue;
    if (
      !civicFits(found, {
        gestalt,
        corporate: authority.corporate,
        ethicsAxes,
        speciesClass,
      })
    )
      continue;
    if (found.cost > civicBudget) continue;
    civics.push(found);
    civicBudget -= found.cost;
  }

  /* traits: resolve, filter by authority kind, add mandatory, respect budget */
  const mandatoryTraits = mandatoryTraitsFor(authority, origin, civics, speciesClass);
  const mandatoryTraitIdSet = new Set(mandatoryTraits.map((t) => t.id));
  const traits: Trait[] = [...mandatoryTraits];
  let traitBudget = TRAIT_POINTS;
  let picks = 0;
  for (const t of stored?.traits ?? []) {
    const found = TRAITS.find((x) => x.id === t?.id);
    if (!found || mandatoryTraitIdSet.has(found.id)) continue;
    if (traits.some((p) => p.id === found.id)) continue;
    if (!traitFits(found, authority)) continue;
    // a portrait class trait that contradicts the pinned class is dropped
    if (
      found.cls &&
      (PORTRAIT_TRAIT_IDS as readonly string[]).includes(found.id) &&
      found.id !== classTraitId
    )
      continue;
    if (found.cls) {
      traits.push(found); // class traits are free and pickless
      continue;
    }
    if (picks >= TRAIT_PICKS || found.cost > traitBudget) continue;
    traits.push(found);
    traitBudget -= found.cost;
    picks += 1;
  }

  const homeworld = origin.homeworld ?? stored?.homeworld ?? "Continental";

  return computeEmpireDerived({
    id: stored?.id ?? uid(),
    name: stored?.name ?? "Nameless Empire",
    species: stored?.species ?? "Unknown",
    speciesAdj: stored?.speciesAdj ?? "Unknown",
    speciesClass,
    ethics,
    authority,
    civics,
    origin,
    traits,
    homeworld,
  });
}

/* ------------------------------------------------------------------ */
/* budget meters                                                       */
/* ------------------------------------------------------------------ */

export function traitPointsUsed(e: GeneratedEmpire): number {
  return e.traits.filter((t) => !t.cls).reduce((n, t) => n + t.cost, 0);
}

export function traitPicksUsed(e: GeneratedEmpire): number {
  return e.traits.filter((t) => !t.cls).length;
}

export function civicPointsUsed(e: GeneratedEmpire): number {
  return e.civics.reduce((n, c) => n + c.cost, 0);
}

export function ethicPointsUsed(e: GeneratedEmpire): number {
  return e.ethics.reduce((n, e2) => n + (e2.fanatic ? 2 : 1), 0);
}

/* ------------------------------------------------------------------ */
/* pure edit operations (used by the detail editor)                    */
/* ------------------------------------------------------------------ */

function bestOriginFor(target: AxisKey, authority: Authority, dlcs: Set<string>): Origin {
  const fitting = ORIGINS.filter((o) => originFits(o, authority.gestalt));
  const pool = fitting.filter((o) => !o.dlc || dlcs.has(o.dlc));
  const source = pool.length > 0 ? pool : fitting;
  return (
    [...source].sort(
      (a, b) => ratingOn(b.r, target) - ratingOn(a.r, target),
    )[0] ?? ORIGINS[0]
  );
}

function defaultEthicsFor(target: AxisKey): EthicsEntry[] {
  const ranked = ETHICS.filter((e) => !e.fanatic).sort(
    (a, b) => ratingOn(b.r, target) - ratingOn(a.r, target),
  );
  const first = ranked[0];
  const second = ranked.find(
    (e) => e.axis !== first.axis && e.axis !== ETHIC_OPPOSITES[first.axis],
  );
  return second ? [first, second] : [first];
}

export function changeAuthority(
  e: GeneratedEmpire,
  authorityId: string,
  dlcs: Set<string>,
): GeneratedEmpire {
  const authority = AUTHORITIES.find((a) => a.id === authorityId);
  if (!authority || authority.id === e.authority.id) return e;
  return normalizeEmpire({
    ...e,
    authority,
    ethics:
      authority.gestalt
        ? []
        : e.ethics.length > 0
          ? e.ethics
          : defaultEthicsFor(e.archetype),
    origin: originFits(e.origin, authority.gestalt)
      ? e.origin
      : bestOriginFor(e.archetype, authority, dlcs),
  });
}

export function changeOrigin(e: GeneratedEmpire, originId: string): GeneratedEmpire {
  const origin = ORIGINS.find((o) => o.id === originId);
  if (!origin || origin.id === e.origin.id) return e;
  return normalizeEmpire({ ...e, origin });
}

/**
 * Switch the species class (portrait). Machine swaps the authority to a
 * Machine Intelligence; leaving Machine picks a fitting regular authority.
 * The class-linked portrait trait is re-derived by normalizeEmpire.
 */
export function changeSpeciesClass(
  e: GeneratedEmpire,
  classId: string,
  dlcs: Set<string>,
): GeneratedEmpire {
  const cls = SPECIES_CLASS_BY_ID[classId];
  if (!cls || cls.id === e.speciesClass) return e;
  if (cls.dlc && !dlcs.has(cls.dlc)) return e;

  let authority = e.authority;
  let ethics = e.ethics;
  if (cls.machine && authority.gestalt !== "machine") {
    const machine = AUTHORITIES.find((a) => a.id === "machine")!;
    if (machine.dlc && !dlcs.has(machine.dlc)) return e;
    authority = machine;
    ethics = [];
  } else if (!cls.machine && authority.gestalt === "machine") {
    authority =
      [...AUTHORITIES]
        .filter((a) => !a.gestalt && (!a.dlc || dlcs.has(a.dlc)))
        .sort((a, b) => ratingOn(b.r, e.archetype) - ratingOn(a.r, e.archetype))[0] ??
      AUTHORITIES[1];
    ethics = e.ethics.length > 0 ? e.ethics : defaultEthicsFor(e.archetype);
  }

  // portrait class traits are re-derived from the new class — strip the old ones
  const traits = e.traits.filter(
    (t) => !(PORTRAIT_TRAIT_IDS as readonly string[]).includes(t.id),
  );
  // origins/civics that required the old class trait are swapped out by normalizeEmpire
  return normalizeEmpire({ ...e, speciesClass: cls.id, authority, ethics, traits });
}

/** cycle one ethic axis: off → regular → fanatic → off */
export function changeEthic(e: GeneratedEmpire, axis: string): GeneratedEmpire {
  if (e.authority.gestalt) return e;
  const current = e.ethics.find((x) => x.axis === axis);
  const nextState = current == null ? 1 : current.fanatic ? 0 : 2;
  let next: EthicsEntry[];
  if (nextState === 0) {
    next = e.ethics.filter((x) => x.axis !== axis);
  } else {
    const entry = ETHICS.find(
      (x) => x.axis === axis && x.fanatic === (nextState === 2),
    );
    if (!entry) return e;
    const others = e.ethics.filter(
      (x) => x.axis !== axis && x.axis !== ETHIC_OPPOSITES[axis],
    );
    const cost =
      others.reduce((n, x) => n + (x.fanatic ? 2 : 1), 0) + nextState;
    if (cost > ETHIC_POINTS) return e; // not enough ethic points — no-op
    next = [...others, entry];
  }
  return normalizeEmpire({ ...e, ethics: next });
}

export function toggleCivic(e: GeneratedEmpire, civicId: string): GeneratedEmpire {
  const civic = CIVICS.find((c) => c.id === civicId);
  if (!civic) return e;
  if (e.civics.some((c) => c.id === civicId)) {
    if (mandatoryCivicIds(e).has(civicId)) return e; // locked in
    return normalizeEmpire({
      ...e,
      civics: e.civics.filter((c) => c.id !== civicId),
    });
  }
  if (civic.cost > CIVIC_POINTS - civicPointsUsed(e)) return e; // over budget
  return normalizeEmpire({ ...e, civics: [...e.civics, civic] });
}

export function toggleTrait(e: GeneratedEmpire, traitId: string): GeneratedEmpire {
  const trait = TRAITS.find((t) => t.id === traitId);
  if (!trait) return e;
  if (e.traits.some((t) => t.id === traitId)) {
    if (mandatoryTraitIdsOf(e).has(traitId)) return e; // locked in
    return normalizeEmpire({
      ...e,
      traits: e.traits.filter((t) => t.id !== traitId),
    });
  }
  if (!traitFits(trait, e.authority)) return e;
  if (!trait.cls) {
    if (traitPicksUsed(e) >= TRAIT_PICKS) return e;
    if (trait.cost > TRAIT_POINTS - traitPointsUsed(e)) return e;
  }
  return normalizeEmpire({ ...e, traits: [...e.traits, trait] });
}

export function changeHomeworld(e: GeneratedEmpire, homeworld: string): GeneratedEmpire {
  if (e.origin.homeworld) return e; // origin forces the homeworld type
  return normalizeEmpire({ ...e, homeworld });
}

export function renameEmpire(
  e: GeneratedEmpire,
  patch: { name?: string; species?: string; speciesAdj?: string },
): GeneratedEmpire {
  return normalizeEmpire({
    ...e,
    name: patch.name !== undefined ? patch.name : e.name,
    species: patch.species !== undefined ? patch.species : e.species,
    speciesAdj: patch.speciesAdj !== undefined ? patch.speciesAdj : e.speciesAdj,
  });
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export function generateEmpires(opts: GenerateOptions): GeneratedEmpire[] {
  const targets: AxisKey[] =
    opts.axes.size > 0 ? [...opts.axes] : AXES.map((a) => a.key);
  const out: GeneratedEmpire[] = [];
  for (let i = 0; i < opts.count; i++) {
    const target = targets[i % targets.length];
    let empire: GeneratedEmpire | null = null;
    // retry a few times so the result actually matches the requested axis
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = buildEmpire(target, opts.dlcs, opts.seed);
      if (opts.axes.size === 0 || candidate.archetype === target) {
        empire = candidate;
        break;
      }
    }
    out.push(empire ?? buildEmpire(target, opts.dlcs, opts.seed));
  }
  return out;
}

export function empireDlcWarning(dlcs: Set<string>): string | null {
  if (!dlcs.has("utopia") && !dlcs.has("synthetic_dawn")) {
    return "Enable Utopia or Synthetic Dawn for Hive Mind / Machine empires.";
  }
  return null;
}
