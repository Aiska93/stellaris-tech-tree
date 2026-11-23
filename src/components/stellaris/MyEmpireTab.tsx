"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Castle,
  CheckCircle2,
  ChevronDown,
  Crown,
  Eraser,
  Lock,
  Percent,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Emblem } from "@/components/stellaris/Emblem";
import { TabSearchBar, useTabSearch } from "@/components/stellaris/TabSearch";
import {
  ALL_EXTRA_DLC_IDS,
  AUTHORITIES,
  CIVIC_POINTS,
  CIVICS,
  ETHIC_POINTS,
  ETHICS,
  ETHICS_COLOR,
  HOMEWORLDS,
  ORIGINS,
  PORTRAIT_TRAIT_IDS,
  SPECIES_CLASSES,
  SPECIES_CLASS_BY_ID,
  TRAITS,
  TRAIT_PICKS,
  TRAIT_POINTS,
  type Civic,
  type Trait,
} from "@/lib/empireData";
import {
  changeAuthority,
  changeEthic,
  changeHomeworld,
  changeOrigin,
  changeSpeciesClass,
  civicFits,
  civicPointsUsed,
  ethicPointsUsed,
  mandatoryCivicIds,
  mandatoryTraitIdsOf,
  originFits,
  toggleCivic,
  toggleTrait,
  traitFits,
  traitPicksUsed,
  traitPointsUsed,
  type GeneratedEmpire,
} from "@/lib/empireGen";
import {
  computeEmpireLocks,
  conditionalStartReasons,
  configFromEmpire,
  empireBonusSummary,
  empireStats,
  factsFromConfig,
  groupLocks,
  permanentStartKeys,
  pseudoEmpireFromConfig,
  type MyEmpireConfig,
} from "@/lib/myEmpire";
import {
  ASCENSION_PERKS,
  DEFAULT_POLICIES,
  DEFENSE_PREFERENCE_OPTIONS,
  MAX_ASCENSION_PERKS,
  MAX_TRADITION_TREES,
  RESEARCH_FOCUS_CATEGORIES,
  RESTRICTION_OPTIONS,
  TRADITION_TREES,
  WAR_DOCTRINES,
  type DefensePreferenceId,
  type PolicyConfig,
  type RestrictionsId,
  type WarDoctrineId,
} from "@/lib/empireExtras";
import { useStoredSet } from "@/lib/useStoredSet";
import { AREA_META, TECH_BY_KEY } from "@/lib/techtree";
import { rateFromInput, RATES_AREAS, type ResearchRates } from "@/lib/rates";
import { STORAGE_PACKS } from "@/components/stellaris/EmpireCreator";
import {
  Chip,
  Field,
  GroupTitle,
  PointsBadge,
  costText,
  selectBase,
  selectCls,
} from "@/components/stellaris/EmpireDetail";

interface MyEmpireTabProps {
  /** the submitted (applied-to-tree) config, if any */
  config: MyEmpireConfig | null;
  onApply: (config: MyEmpireConfig) => void;
  onClear: () => void;
  /** tech-tree DLC selection shared with the header filter */
  activeDlcs: Set<string>;
  onViewTree: () => void;
  /** the Ascension Theory technology is researched (+1 ascension perk slot) */
  hasAscensionTheory: boolean;
  /** monthly research output per area (for time estimates) */
  rates: ResearchRates;
  onRatesChange: (rates: ResearchRates) => void;
}

export function MyEmpireTab({
  config,
  onApply,
  onClear,
  activeDlcs,
  onViewTree,
  hasAscensionTheory,
  rates,
  onRatesChange,
}: MyEmpireTabProps) {
  /* in-tab search — highlights matching boxes, never hides anything */
  const rootRef = useRef<HTMLElement>(null);
  const { query, setQuery, hits } = useTabSearch(rootRef);
  /* empire-only packs share the Empire Creator's DLC store */
  const [packs] = useStoredSet(
    STORAGE_PACKS,
    ALL_EXTRA_DLC_IDS,
    (id) => ALL_EXTRA_DLC_IDS.has(id),
  );
  const dlcs = useMemo(
    () => new Set([...activeDlcs, ...packs]),
    [activeDlcs, packs],
  );

  /* draft — edited through the generator's change* helpers */
  const [draft, setDraft] = useState<GeneratedEmpire>(() =>
    pseudoEmpireFromConfig(config),
  );
  /* BioGenesis biological ship set — not part of GeneratedEmpire, kept apart */
  const [bioShip, setBioShip] = useState<boolean>(config?.bioShip ?? false);
  /* traditions / policies / ascension perks (kept apart from GeneratedEmpire) */
  const [traditions, setTraditions] = useState<Set<string>>(
    () => new Set(config?.traditions ?? []),
  );
  const [policies, setPolicies] = useState<PolicyConfig>(() => ({
    ...DEFAULT_POLICIES,
    ...config?.policies,
    researchFocus: {
      ...DEFAULT_POLICIES.researchFocus,
      ...config?.policies.researchFocus,
    },
  }));
  const [perks, setPerks] = useState<Set<string>>(
    () => new Set(config?.perks ?? []),
  );

  /* re-sync the draft whenever the submitted config changes (e.g. an empire
     was sent over from the Empire Creator) — adjusted during render rather
     than in an effect, per the React docs */
  const [syncedConfig, setSyncedConfig] = useState(config);
  if (config !== syncedConfig) {
    setSyncedConfig(config);
    setDraft(pseudoEmpireFromConfig(config));
    setBioShip(config?.bioShip ?? false);
    setTraditions(new Set(config?.traditions ?? []));
    setPolicies({
      ...DEFAULT_POLICIES,
      ...config?.policies,
      researchFocus: {
        ...DEFAULT_POLICIES.researchFocus,
        ...config?.policies.researchFocus,
      },
    });
    setPerks(new Set(config?.perks ?? []));
  }

  const edit = useCallback(
    (fn: (e: GeneratedEmpire) => GeneratedEmpire) => {
      setDraft((prev) => fn(prev));
    },
    [],
  );

  /* ---- derived option pools (same rules as the Empire Creator editor) ---- */

  const gestalt = draft.authority.gestalt;
  const bioShipAllowed = gestalt !== "machine";
  const bioShipOn = bioShip && bioShipAllowed;
  const dlcOk = (x: { dlc: string | null }) => !x.dlc || dlcs.has(x.dlc);
  const lockedCivics = mandatoryCivicIds(draft);
  const lockedTraits = mandatoryTraitIdsOf(draft);
  const civicLeft = CIVIC_POINTS - civicPointsUsed(draft);
  const traitLeft = TRAIT_POINTS - traitPointsUsed(draft);
  const picksLeft = TRAIT_PICKS - traitPicksUsed(draft);
  const currentClass =
    SPECIES_CLASS_BY_ID[draft.speciesClass] ?? SPECIES_CLASS_BY_ID.humanoid;

  const classOptions = SPECIES_CLASSES.filter(
    (c) => c.id === draft.speciesClass || dlcOk(c),
  );
  const authorityOptions = AUTHORITIES.filter(
    (a) => a.id === draft.authority.id || dlcOk(a),
  );
  const originOptions = ORIGINS.filter(
    (o) => o.id === draft.origin.id || dlcOk(o),
  );

  const ethicsAxes = new Set(draft.ethics.map((e) => e.axis));
  const civicCtx = {
    gestalt,
    corporate: draft.authority.corporate,
    ethicsAxes,
    speciesClass: draft.speciesClass,
  };

  const civicChips: {
    c: Civic;
    on: boolean;
    locked: boolean;
    disabled: boolean;
    reason: string;
  }[] = [];
  for (const c of CIVICS) {
    const on = draft.civics.some((x) => x.id === c.id);
    const locked = lockedCivics.has(c.id);
    if (!locked) {
      const fits = civicFits(c, civicCtx);
      const ethicsLocked =
        !fits && !gestalt && c.req?.ethicsAny != null && !c.req.corporate;
      const speciesLocked =
        !fits &&
        (c.requiresTraits ?? []).some((id) =>
          (PORTRAIT_TRAIT_IDS as readonly string[]).includes(id),
        );
      if (!on && !fits && !ethicsLocked && !speciesLocked) continue;
      if (!on && !dlcOk(c)) continue;
    }
    let disabled = false;
    let reason = "";
    if (!locked && !on) {
      const reqTraitId = (c.requiresTraits ?? []).find((id) =>
        (PORTRAIT_TRAIT_IDS as readonly string[]).includes(id),
      );
      if (reqTraitId != null && !civicFits(c, civicCtx)) {
        disabled = true;
        const t = TRAITS.find((x) => x.id === reqTraitId);
        reason = `Requires a ${t?.name ?? "special"} species`;
      } else if (!civicFits(c, civicCtx)) {
        disabled = true;
        reason = `Requires one of: ${c.req?.ethicsAny?.join(" / ")} ethic`;
      } else if (c.cost > civicLeft) {
        disabled = true;
        reason = `Not enough civic points (${civicLeft}/${CIVIC_POINTS} left)`;
      }
    }
    civicChips.push({ c, on, locked, disabled, reason });
  }

  const traitChips: {
    t: Trait;
    on: boolean;
    locked: boolean;
    disabled: boolean;
    reason: string;
  }[] = [];
  for (const t of TRAITS) {
    const on = draft.traits.some((x) => x.id === t.id);
    const locked = lockedTraits.has(t.id);
    if (!locked) {
      if (!traitFits(t, draft.authority)) continue;
      if (t.id === "latent_psionic" && !on) continue;
      if (!on && (PORTRAIT_TRAIT_IDS as readonly string[]).includes(t.id)) continue;
      if (!on && !dlcOk(t)) continue;
    }
    let disabled = false;
    let reason = "";
    if (!locked && !on && !t.cls) {
      if (t.cost > traitLeft) {
        disabled = true;
        reason = `Not enough trait points (${traitLeft}/${TRAIT_POINTS} left)`;
      } else if (picksLeft <= 0) {
        disabled = true;
        reason = `Max ${TRAIT_PICKS} trait picks`;
      }
    }
    traitChips.push({ t, on, locked, disabled, reason });
  }

  const classTraits = traitChips.filter((x) => x.t.cls);
  const positiveTraits = traitChips.filter((x) => !x.t.cls && x.t.cost > 0);
  const negativeTraits = traitChips.filter((x) => !x.t.cls && x.t.cost < 0);

  /* ---- ethics chips ---- */

  const ethicState = (axisId: string): 0 | 1 | 2 => {
    const e = draft.ethics.find((x) => x.axis === axisId);
    if (!e) return 0;
    return e.fanatic ? 2 : 1;
  };
  const regularEthicName = (axisId: string) =>
    ETHICS.find((e) => e.axis === axisId && !e.fanatic)!.name;

  /* ---- traditions / policies / ascension perks ---- */

  /** trees visible for this empire: DLC active + gestalt rule */
  const availableTrees = useMemo(
    () =>
      TRADITION_TREES.filter((t) => {
        if (t.dlc && !dlcs.has(t.dlc)) return false;
        if (t.gestalt === "only" && gestalt == null) return false;
        if (t.gestalt === "never" && gestalt != null) return false;
        return true;
      }),
    [dlcs, gestalt],
  );

  /** perk slots: one per finished tree, +1 for Ascension Theory, cap 8 */
  const perkSlots = Math.min(
    MAX_ASCENSION_PERKS,
    traditions.size + (hasAscensionTheory ? 1 : 0),
  );

  /** is a perk pickable right now? (requirement + slot budget) */
  const perkFits = useCallback(
    (perkId: string): { ok: boolean; reason: string | null } => {
      if (perks.has(perkId)) return { ok: true, reason: null };
      if (perks.size >= perkSlots)
        return { ok: false, reason: `All ${perkSlots} ascension perk slots used` };
      const perk = ASCENSION_PERKS.find((p) => p.id === perkId)!;
      if (perk.dlc && !dlcs.has(perk.dlc))
        return { ok: false, reason: `Requires the ${perk.dlc} DLC` };
      if (perk.id === "eternal_vigilance" && !traditions.has("fortification"))
        return { ok: false, reason: "Requires the Fortification tradition tree" };
      if ((perk.id === "mind_over_matter" || perk.id === "the_flesh_is_weak") && gestalt)
        return { ok: false, reason: "Not available to gestalt empires" };
      if (
        (perk.id === "synthetic_age" || perk.id === "mechromancy") &&
        gestalt !== "machine"
      )
        return { ok: false, reason: "Requires a Machine Intelligence" };
      return { ok: true, reason: null };
    },
    [perks, perkSlots, dlcs, traditions, gestalt],
  );

  const toggleTree = useCallback(
    (id: string) => {
      setTraditions((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (next.size < MAX_TRADITION_TREES) next.add(id);
        else return prev;
        return next;
      });
    },
    [],
  );

  const togglePerk = useCallback(
    (id: string) => {
      setPerks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else {
          if (!perkFits(id).ok) return prev;
          next.add(id);
        }
        return next;
      });
    },
    [perkFits],
  );

  const setPolicy = useCallback(
    <K extends keyof PolicyConfig>(key: K, value: PolicyConfig[K]) => {
      setPolicies((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setResearchFocus = useCallback(
    (area: "physics" | "society" | "engineering", cat: string) => {
      setPolicies((prev) => ({
        ...prev,
        researchFocus: { ...prev.researchFocus, [area]: cat },
      }));
    },
    [],
  );

  /* ---- submit / clear ---- */

  /**
   * Final config: invalid trees / perks (wrong authority, missing DLC, no
   * slot left) are silently dropped so the persisted config always fits the
   * current empire.
   */
  const draftConfig = useCallback((): MyEmpireConfig => {
    const treeIds = [...traditions].filter((id) =>
      availableTrees.some((t) => t.id === id),
    );
    const slotCount = Math.min(
      MAX_ASCENSION_PERKS,
      treeIds.length + (hasAscensionTheory ? 1 : 0),
    );
    const perkList: string[] = [];
    for (const id of perks) {
      if (perkList.length >= slotCount) break;
      const perk = ASCENSION_PERKS.find((p) => p.id === id);
      if (!perk) continue;
      if (perk.dlc && !dlcs.has(perk.dlc)) continue;
      if (perk.id === "eternal_vigilance" && !treeIds.includes("fortification"))
        continue;
      if ((perk.id === "mind_over_matter" || perk.id === "the_flesh_is_weak") && gestalt)
        continue;
      if ((perk.id === "synthetic_age" || perk.id === "mechromancy") && gestalt !== "machine")
        continue;
      perkList.push(id);
    }
    return {
      ...configFromEmpire(draft),
      bioShip: bioShipOn,
      traditions: treeIds,
      policies: {
        ...policies,
        // war doctrines need the Supremacy finisher — reset when unavailable
        warDoctrine: treeIds.includes("supremacy") ? policies.warDoctrine : "none",
      },
      perks: perkList,
    };
  }, [draft, bioShipOn, traditions, policies, perks, availableTrees, hasAscensionTheory, dlcs, gestalt]);

  const submit = useCallback(() => {
    const next = draftConfig();
    onApply(next);
    const facts = factsFromConfig(next);
    const grants = conditionalStartReasons(facts);
    const extras = [
      next.traditions.length > 0 ? `${next.traditions.length} tradition trees` : null,
      next.perks.length > 0 ? `${next.perks.length} ascension perks` : null,
    ].filter(Boolean);
    toast.success("Empire applied to the tech tree", {
      description:
        `Locked technologies, research odds and ${grants.reduce((n, g) => n + g.names.length, 0)} empire starting techs updated` +
        (extras.length > 0 ? ` — ${extras.join(" · ")} active.` : "."),
    });
  }, [draftConfig, onApply]);

  const clear = useCallback(() => {
    onClear();
    toast.info("Empire removed — the full tech tree is available again");
  }, [onClear]);

  /* ---- applied summary ---- */

  const summary = useMemo(() => {
    if (!config) return null;
    const facts = factsFromConfig(config);
    const locks = computeEmpireLocks(facts);
    return {
      facts,
      lockGroups: groupLocks(locks),
      lockCount: locks.size,
      bonuses: empireBonusSummary(facts),
      startReasons: conditionalStartReasons(facts),
      startCount: permanentStartKeys(facts).size,
      stats: empireStats(facts),
    };
  }, [config]);

  const dirty = useMemo(
    () => JSON.stringify(draftConfig()) !== JSON.stringify(config),
    [draftConfig, config],
  );

  /* live preview: which empire-conditional starting techs the draft grants */
  const draftGrants = useMemo(
    () => conditionalStartReasons(factsFromConfig(draftConfig())),
    [draftConfig],
  );

  return (
    <section id="my-empire" ref={rootRef} className="scroll-mt-40">
      {/* ---------- header ---------- */}
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-300/20 to-amber-500/10"
        >
          <Castle className="h-5 w-5 text-amber-300" />
        </span>
        <h2
          className="text-base font-semibold uppercase tracking-[0.18em] text-slate-50"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          My Empire
        </h2>
        <span className="text-xs text-slate-300">
          Your empire — locked techs &amp; research odds in the tree
        </span>
        <span
          aria-hidden
          className="h-px min-w-8 flex-1"
          style={{ background: "linear-gradient(to right, #fbbf2466, transparent)" }}
        />
        {/* search bar — right upper corner of the tab */}
        <TabSearchBar
          query={query}
          onQueryChange={setQuery}
          hits={hits}
          accent="amber"
          rootRef={rootRef}
          placeholder="Search My Empire…"
        />
      </header>

      {/* ---------- research output (time estimates) ---------- */}
      <div
        data-search-box
        className="mb-5 rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3.5"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-300/80">
          Research output — time estimates
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
          Enter what each area produces per month (see the research view in
          game). Hovering a tech card then shows how long it takes — and the
          playstyle &ldquo;Next up&rdquo; chips use it too.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {RATES_AREAS.map((a) => (
            <label
              key={a}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: AREA_META[a].color }}
              />
              <span className="text-[11.5px] font-medium text-slate-200">
                {AREA_META[a].label}
              </span>
              <input
                type="number"
                min={1}
                max={99999}
                inputMode="numeric"
                value={rates[a] ?? ""}
                placeholder="—"
                aria-label={`${AREA_META[a].label} research output per month`}
                onChange={(e) =>
                  onRatesChange({ ...rates, [a]: rateFromInput(e.target.value) })
                }
                className="w-[4.5rem] rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-right text-[12px] tabular-nums text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
              />
              <span className="text-[10px] text-slate-500">/mo</span>
            </label>
          ))}
          {(rates.physics ?? rates.society ?? rates.engineering) != null && (
            <button
              type="button"
              onClick={() => onRatesChange({ physics: null, society: null, engineering: null })}
              className="self-center text-[10.5px] font-medium text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              clear
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ---------------- editor ---------------- */}
        <div data-search-box className="rounded-xl border border-amber-300/25 bg-slate-950/70 p-4 shadow-xl shadow-black/30 backdrop-blur-sm">
          <p className="text-[11px] leading-relaxed text-slate-300">
            Choose your empire&apos;s settings — hitting{" "}
            <span className="font-semibold text-amber-300">Apply</span> activates
            every technology this empire can research and grays out the ones it
            can never get. Requirement-gated techs (psionics, Machine
            Intelligence techs, the biological ship line, …) are checked against
            a generic organic empire until you apply your own. Send an empire
            over from the Empire Creator to start from it.
          </p>

          <div className="mt-2 grid gap-x-8 lg:grid-cols-2">
            <div className="min-w-0 border-slate-800 lg:border-r lg:pr-6">
              <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                Empire Setup
              </p>

              <div className="mt-1.5">
                <Field label="Species">
                  <span className="flex flex-wrap gap-1.5">
                    {draft.authority.gestalt === "machine" ? (
                      <span
                        title="A Machine Intelligence is always a Machine species"
                        className="inline-flex w-[124px] shrink-0 cursor-not-allowed items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-[11.5px] font-semibold text-slate-300"
                      >
                        <Lock className="h-2.5 w-2.5 text-emerald-300" aria-hidden />
                        {currentClass.name}
                      </span>
                    ) : (
                      <select
                        value={draft.speciesClass}
                        onChange={(e) =>
                          edit((emp) => changeSpeciesClass(emp, e.target.value, dlcs))
                        }
                        className={`${selectBase} w-[124px] shrink-0`}
                        aria-label="Species class"
                        title={`Species class — ${currentClass.desc}`}
                      >
                        {classOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.machine ? " — Machine Intelligence" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    <span
                      title="Species class — portrait archetype; the class trait (Machine / Lithoid / Plantoid) changes which techs you can get"
                      className="inline-flex flex-1 cursor-help items-center gap-1 rounded-md border border-slate-700/70 bg-slate-900/40 px-2 text-[10.5px] italic leading-tight text-slate-400"
                    >
                      {currentClass.desc}
                    </span>
                  </span>
                </Field>

                <Field label="Authority">
                  <select
                    value={draft.authority.id}
                    onChange={(e) =>
                      edit((emp) => changeAuthority(emp, e.target.value, dlcs))
                    }
                    className={selectCls}
                    aria-label="Authority"
                  >
                    {authorityOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Origin">
                  <select
                    value={draft.origin.id}
                    onChange={(e) => edit((emp) => changeOrigin(emp, e.target.value))}
                    className={selectCls}
                    aria-label="Origin"
                  >
                    {originOptions.map((o) => {
                      const fits =
                        o.id === draft.origin.id ||
                        originFits(o, gestalt, draft.speciesClass);
                      return (
                        <option key={o.id} value={o.id} disabled={!fits}>
                          {o.name}
                          {o.req?.gestalt === "hive" && !fits ? " (needs Hive Mind)" : ""}
                          {o.req?.gestalt === "machine" && !fits
                            ? " (needs Machine Intelligence)"
                            : ""}
                          {o.req?.notGestalt && !fits ? " (non-gestalt only)" : ""}
                          {o.requiresTraits?.includes("lithoid") && !fits
                            ? " (needs Lithoid species)"
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>

                <Field label="Homeworld">
                  {draft.origin.homeworld ? (
                    <span
                      title={`Forced by the ${draft.origin.name} origin`}
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-[11.5px] font-semibold text-slate-300"
                    >
                      <Lock className="h-2.5 w-2.5 text-emerald-300" aria-hidden />
                      {draft.origin.homeworld}
                    </span>
                  ) : (
                    <select
                      value={draft.homeworld}
                      onChange={(e) => edit((emp) => changeHomeworld(emp, e.target.value))}
                      className={selectCls}
                      aria-label="Homeworld type"
                    >
                      {HOMEWORLDS.map((h) => (
                        <option key={h} value={h}>
                          {h} World
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                {/* BioGenesis biological ship set — grants the weaver techs at start */}
                <Field label="Ship Set">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={bioShipOn}
                      disabled={!bioShipAllowed}
                      onClick={() => setBioShip((v) => !v)}
                      data-bio-ship-toggle
                      title={
                        bioShipAllowed
                          ? "Empires flying the BioGenesis biological ship set begin the game knowing Weavers, Maulers, Vector Lock Cannon and Energy Burster — those techs stay permanently researched while this setting is applied"
                          : "Machine Intelligences cannot use biological ships"
                      }
                      className={[
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                        !bioShipAllowed
                          ? "cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-600"
                          : bioShipOn
                            ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
                            : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500 hover:text-white",
                      ].join(" ")}
                    >
                      {bioShipOn && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                      {bioShipOn ? "Biological ships (BioGenesis)" : "Standard ship set"}
                    </button>
                    {draftGrants.length > 0 && (
                      <span
                        title="Starting technologies granted by the current selection — permanently researched once applied"
                        className="inline-flex flex-1 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium leading-tight text-emerald-200"
                      >
                        Starts with:{" "}
                        {draftGrants
                          .flatMap((g) => g.names)
                          .slice(0, 5)
                          .join(", ")}
                        {draftGrants.flatMap((g) => g.names).length > 5 ? "…" : ""}
                      </span>
                    )}
                  </span>
                </Field>
              </div>

              {/* ethics */}
              <GroupTitle
                right={
                  gestalt ? undefined : (
                    <PointsBadge used={ethicPointsUsed(draft)} max={ETHIC_POINTS} />
                )}
              >
                Ethics
              </GroupTitle>
              {gestalt ? (
                <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-fuchsia-400/50 bg-fuchsia-400/15 px-2 py-1 text-[11px] font-semibold text-fuchsia-200">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Gestalt Consciousness — no ethics
                </span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {Object.keys(ETHICS_COLOR).map((axisId) => {
                    const state = ethicState(axisId);
                    const color = ETHICS_COLOR[axisId];
                    const label =
                      state === 2
                        ? `Fanatic ${regularEthicName(axisId)}`
                        : regularEthicName(axisId);
                    return (
                      <button
                        key={axisId}
                        type="button"
                        onClick={() => edit((emp) => changeEthic(emp, axisId))}
                        aria-pressed={state > 0}
                        title={`Click to cycle: off → ${regularEthicName(axisId)} (1 pt) → Fanatic (2 pts)`}
                        className={[
                          "rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
                          state === 0
                            ? "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500 hover:text-white"
                            : "",
                        ].join(" ")}
                        style={
                          state > 0
                            ? {
                                borderColor: state === 2 ? color : `${color}88`,
                                background: state === 2 ? `${color}40` : `${color}1c`,
                                color: state === 2 ? "#f8fafc" : color,
                              }
                            : undefined
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </span>
              )}

              {/* civics */}
              <GroupTitle right={<PointsBadge used={civicPointsUsed(draft)} max={CIVIC_POINTS} />}>
                Civics
              </GroupTitle>
              <span className="flex flex-wrap gap-1">
                {civicChips.map(({ c, on, locked, disabled, reason }) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    on={on}
                    locked={locked}
                    lockedReason={
                      c.id === "hive_mind"
                        ? "the Hive Mind authority"
                        : c.id === "machine_intelligence"
                          ? "the Machine Intelligence authority"
                          : "this empire's setup"
                    }
                    disabled={disabled}
                    disabledReason={reason}
                    costLabel={locked ? "free" : costText(c.cost)}
                    tone="cyan"
                    onClick={() => edit((emp) => toggleCivic(emp, c.id))}
                  />
                ))}
              </span>

              {/* traits */}
              <GroupTitle
                right={
                  <PointsBadge
                    used={traitPointsUsed(draft)}
                    max={TRAIT_POINTS}
                    extra={`${traitPicksUsed(draft)}/${TRAIT_PICKS} picks`}
                  />
                }
              >
                Species Traits
              </GroupTitle>
              <span className="flex flex-wrap gap-x-3 gap-y-1.5">
                {classTraits.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {classTraits.map(({ t, on, locked, disabled, reason }) => (
                      <Chip
                        key={t.id}
                        label={t.name}
                        on={on}
                        locked={locked}
                        lockedReason="this empire's species class"
                        disabled={disabled}
                        disabledReason={reason}
                        costLabel="class"
                        tone="violet"
                        onClick={() => edit((emp) => toggleTrait(emp, t.id))}
                      />
                    ))}
                  </span>
                )}
                <span className="flex flex-wrap gap-1">
                  {positiveTraits.map(({ t, on, locked, disabled, reason }) => (
                    <Chip
                      key={t.id}
                      label={t.name}
                      on={on}
                      locked={locked}
                      lockedReason="this empire's setup"
                      disabled={disabled}
                      disabledReason={reason}
                      costLabel={costText(t.cost)}
                      tone="emerald"
                      onClick={() => edit((emp) => toggleTrait(emp, t.id))}
                    />
                  ))}
                </span>
                <span className="flex flex-wrap gap-1">
                  {negativeTraits.map(({ t, on, locked, disabled, reason }) => (
                    <Chip
                      key={t.id}
                      label={t.name}
                      on={on}
                      locked={locked}
                      lockedReason="this empire's setup"
                      disabled={disabled}
                      disabledReason={reason}
                      costLabel={costText(t.cost)}
                      tone="rose"
                      onClick={() => edit((emp) => toggleTrait(emp, t.id))}
                    />
                  ))}
                </span>
              </span>
            </div>

            {/* ---------------- right form column: submit ---------------- */}
            <div className="mt-4 flex flex-col min-w-0 lg:mt-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                Apply
              </p>
              <div data-search-box className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[11px] leading-relaxed text-slate-400">
                  The settings above determine which technologies are forever
                  locked, which are permanently researched starting techs, and
                  how likely each is to appear as a research option. Base
                  weights are game data; empire modifiers follow the wiki where
                  verified.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={submit}
                    data-my-empire-apply
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 text-[13px] font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-300 hover:to-yellow-400 hover:shadow-amber-400/30"
                  >
                    <Send className="h-4 w-4" />
                    Apply to Tech Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(pseudoEmpireFromConfig(config))}
                    disabled={!dirty}
                    title={
                      dirty
                        ? "Discard your edits and go back to the applied empire"
                        : "No changes yet"
                    }
                    className={[
                      "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-[12px] font-semibold transition-colors",
                      dirty
                        ? "border-slate-600 text-slate-200 hover:border-amber-400/60 hover:text-amber-200"
                        : "cursor-not-allowed border-slate-800 text-slate-600",
                    ].join(" ")}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Reset form
                  </button>
                  {config && (
                    <button
                      type="button"
                      onClick={clear}
                      data-my-empire-clear
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-400/40 px-3.5 text-[12px] font-semibold text-rose-300 transition-colors hover:border-rose-400 hover:bg-rose-400/10 hover:text-rose-200"
                    >
                      Remove Empire
                    </button>
                  )}
                </div>
                {dirty && (
                  <p className="mt-2 text-[10.5px] italic text-amber-300/80">
                    Unapplied changes — hit Apply to update the tree.
                  </p>
                )}
              </div>

              {/* applied summary */}
              {summary && config ? (
                <div data-search-box className="mt-3 rounded-lg border border-amber-300/30 bg-amber-400/[0.06] p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Applied to the tree
                  </p>
                  <p className="mt-1.5 text-[13px] font-bold leading-tight text-slate-50">
                    <Crown className="mr-1 inline h-3.5 w-3.5 text-amber-300" aria-hidden />
                    {config.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                    {draft.authority.name} · {draft.origin.name} ·{" "}
                    {SPECIES_CLASS_BY_ID[config.speciesClass]?.name ?? config.speciesClass}
                  </p>

                  <p className="mt-2.5 text-[11px] font-semibold text-rose-300">
                    {summary.lockCount} tech
                    {summary.lockCount === 1 ? "" : "s"} locked for this empire
                  </p>
                  <ul className="mt-1 space-y-1">
                    {summary.lockGroups.slice(0, 4).map((g) => (
                      <li key={g.reason} className="text-[10.5px] leading-snug text-slate-300">
                        <span className="font-bold text-rose-300">{g.keys.length}</span>{" "}
                        — {g.reason}
                        <span className="text-slate-500">
                          {" "}
                          (e.g.{" "}
                          {g.keys
                            .slice(0, 3)
                            .map((k) => TECH_BY_KEY.get(k)?.name ?? k)
                            .join(", ")}
                          {g.keys.length > 3 ? "…" : ""})
                        </span>
                      </li>
                    ))}
                    {summary.lockGroups.length > 4 && (
                      <li className="text-[10.5px] text-slate-500">
                        +{summary.lockGroups.length - 4} more lock rules
                      </li>
                    )}
                  </ul>

                  {summary.startReasons.length > 0 && (
                    <>
                      <p className="mt-2.5 text-[11px] font-semibold text-emerald-300">
                        {summary.startReasons.reduce((n, g) => n + g.names.length, 0)} extra
                        starting tech
                        {summary.startReasons.reduce((n, g) => n + g.names.length, 0) === 1
                          ? ""
                          : "s"}{" "}
                        ({summary.startCount} permanently researched in total)
                      </p>
                      <ul className="mt-1 space-y-1">
                        {summary.startReasons.map((g) => (
                          <li
                            key={g.setting}
                            className="text-[10.5px] leading-snug text-slate-300"
                          >
                            <span className="font-bold text-emerald-300">{g.setting}</span>
                            {" — "}
                            {g.names.join(", ")}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {summary.bonuses.length > 0 && (
                    <>
                      <p className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                        <Percent className="h-3 w-3" aria-hidden />
                        Active draw-weight modifiers
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {summary.bonuses.map((b) => (
                          <li
                            key={b}
                            className="rounded border border-cyan-300/25 bg-cyan-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-cyan-100"
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* empire statistics */}
                  <div data-search-box className="mt-2.5 rounded-lg border border-slate-700/60 bg-slate-950/50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      Empire statistics
                    </p>
                    <dl className="mt-1.5 space-y-1 text-[10.5px] leading-snug">
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-slate-400">Research speed</dt>
                        <dd className="font-bold text-cyan-200">
                          {Math.round((summary.stats.researchSpeed - 1) * 100) > 0
                            ? `+${Math.round((summary.stats.researchSpeed - 1) * 100)}%`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-slate-400">Research alternatives</dt>
                        <dd className="font-bold text-cyan-200">
                          {summary.stats.alternatives}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-slate-400">Rare tech draw chance</dt>
                        <dd className="font-bold text-cyan-200">
                          ×{summary.stats.rareMult.toFixed(2).replace(/\.?0+$/, "")}
                        </dd>
                      </div>
                      {summary.stats.trees.length > 0 && (
                        <div>
                          <dt className="text-slate-400">Traditions</dt>
                          <dd className="text-slate-200">
                            {summary.stats.trees.join(", ")}
                          </dd>
                        </div>
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-slate-400">War doctrine</dt>
                        <dd className="font-bold text-rose-200">
                          {summary.stats.warDoctrine ?? "None"}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-slate-400">Defense preference</dt>
                        <dd className="font-bold text-emerald-200">
                          {summary.stats.defensePreference}
                        </dd>
                      </div>
                      {summary.stats.perks.length > 0 && (
                        <div>
                          <dt className="text-slate-400">Ascension perks</dt>
                          <dd className="text-slate-200">
                            {summary.stats.perks.join(", ")}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={onViewTree}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-300/50 px-3 py-1.5 text-[11.5px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/10"
                  >
                    View tech tree →
                  </button>
                </div>
              ) : (
                <div data-search-box className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    No empire applied yet — requirement-gated technologies
                    (psionics, Machine Intelligence techs, bio-ships…) are
                    grayed out for a generic organic empire right now. Pick your
                    settings and hit{" "}
                    <span className="font-semibold text-amber-300">Apply</span>,
                    or send an empire over from the{" "}
                    <span className="font-semibold text-rose-300">Empire Creator</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- legend column ---------------- */}
        <div data-search-box className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            <ChevronDown className="h-3.5 w-3.5 rotate-0 text-slate-500" aria-hidden />
            How the odds work
          </p>
          <div className="mt-2 space-y-2.5 text-[11px] leading-relaxed text-slate-300">
            <p>
              Every technology has a real in-game{" "}
              <span className="font-semibold text-cyan-200">draw weight</span> (v
              4.3.7 data). When the game offers research options it draws{" "}
              <span className="font-semibold text-cyan-200">3 cards</span> (4 with
              Technocracy) from everything currently researchable in the area —
              so a tech&apos;s odds are its weight divided by the whole pool.
            </p>
            <p>
              Your empire shifts those weights: ethics, civics, origins and
              species traits raise or lower specific techs (e.g. Fanatic
              Xenophile triples Xenology&apos;s weight, Lithoids get Bio-Reactor
              ×20, Hive Minds draw biology techs ×1.25).
            </p>
            <p>
              Techs also need their{" "}
              <span className="font-semibold text-slate-100">prerequisites</span>{" "}
              researched and <span className="font-semibold text-slate-100">6 techs</span>{" "}
              of the tier below before their tier opens — dimmed percentages show
              the odds as if the tech were available right now.
            </p>
            <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 text-[10.5px] text-emerald-200">
              Empire-specific starting techs (Weavers, Synaptic Structures,
              Centers of Being…) are only permanently researched while the
              matching setting is applied here — every other empire researches
              them normally.
            </p>
            <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-[10.5px] text-rose-200">
              Grayed-out cards with a red frame don&apos;t meet an empire
              requirement — psionics need the Spiritualist ethic, Node
              Reformatting needs a Machine Intelligence, the Weaver line needs
              the biological ship set. They activate once you apply the right
              settings here; with no empire applied they are checked against a
              generic organic empire.
            </p>
            <p className="text-[10px] italic text-slate-500">
              Base weights and locks follow the game files and wiki (4.5 tables);
              trait effects marked “≈” are a fan-model approximation.
            </p>
          </div>
        </div>
      </div>

        {/* ---------------- traditions / policies / ascension perks ---------------- */}
        <div className="mt-5 grid gap-5 xl:grid-cols-3" data-empire-extras>
          {/* ---- traditions ---- */}
          <div data-search-box className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3.5">
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
              <Emblem icon="sparkles" color="#38bdf8" size={20} />
              Traditions
              <span className="ml-auto rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-px text-[9.5px] font-bold tabular-nums text-cyan-100">
                {traditions.size}/{MAX_TRADITION_TREES} trees
              </span>
            </p>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">
              Finished tradition trees — each one unlocks an ascension perk slot
              and shifts research odds or empire statistics.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableTrees.map((t) => {
                const on = traditions.has(t.id);
                const full = !on && traditions.size >= MAX_TRADITION_TREES;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    disabled={full}
                    data-tradition={t.id}
                    onClick={() => toggleTree(t.id)}
                    title={`${t.name} — ${t.desc}`}
                    className={[
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all",
                      on ? "shadow-md" : "",
                      full ? "cursor-not-allowed opacity-40" : "hover:brightness-125",
                    ].join(" ")}
                    style={{
                      borderColor: on ? `${t.color}aa` : "rgba(100,116,139,0.3)",
                      background: on ? `${t.color}1e` : "rgba(2,6,23,0.5)",
                    }}
                  >
                    <Emblem icon={t.icon} color={t.color} size={24} />
                    <span className="min-w-0">
                      <span
                        className="block text-[11px] font-semibold leading-tight"
                        style={{ color: on ? t.color : "#cbd5e1" }}
                      >
                        {t.name}
                      </span>
                      <span className="block max-w-[150px] truncate text-[9px] leading-tight text-slate-400">
                        {t.effect}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- policies ---- */}
          <div data-search-box className="rounded-xl border border-amber-300/20 bg-slate-950/60 p-3.5">
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-200">
              <Emblem icon="scale" color="#fbbf24" size={20} />
              Policies
              <span className="ml-auto text-[9px] font-medium normal-case tracking-normal text-slate-500">
                affect odds, locks &amp; ships
              </span>
            </p>

            {/* war doctrine */}
            <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
              <Emblem icon="swords" color="#f87171" size={16} />
              War Doctrine
              {!traditions.has("supremacy") && (
                <span
                  title="War Doctrines unlock when the Supremacy tradition tree is finished"
                  className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium italic text-slate-500"
                >
                  <Lock className="h-2.5 w-2.5" aria-hidden /> Supremacy required
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {WAR_DOCTRINES.map((d) => {
                const supremacy = traditions.has("supremacy");
                const needsEthic =
                  d.id === "no_retreat" &&
                  gestalt == null &&
                  ethicState("militarist") === 0;
                const disabled =
                  d.id !== "none" && (!supremacy || needsEthic);
                const on = policies.warDoctrine === d.id && !disabled;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    data-war-doctrine={d.id}
                    onClick={() => setPolicy("warDoctrine", d.id as WarDoctrineId)}
                    title={`${d.name} — ${d.desc}${disabled ? ` (locked: ${d.requires ?? "Militarist or gestalt"})` : ""}`}
                    className={[
                      "rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
                      disabled
                        ? "cursor-not-allowed border-slate-800 text-slate-600"
                        : on
                          ? "border-rose-400/70 bg-rose-400/15 text-rose-200"
                          : "border-slate-700 text-slate-300 hover:border-rose-400/50 hover:text-rose-200",
                    ].join(" ")}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>

            {/* research focus */}
            <p className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
              <Emblem icon="flask" color="#38bdf8" size={16} />
              Research Focus <span className="text-[9px] font-normal text-slate-500">(+25% option chance)</span>
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["physics", "society", "engineering"] as const).map((area) => (
                <select
                  key={area}
                  value={policies.researchFocus[area]}
                  onChange={(e) => setResearchFocus(area, e.target.value)}
                  aria-label={`${area} research focus`}
                  className={`${selectBase} w-full text-[10px]`}
                  title={`Research focus for ${area} — focused categories are drawn ×1.25 more often`}
                >
                  <option value="general">General</option>
                  {RESEARCH_FOCUS_CATEGORIES[area].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ))}
            </div>

            {/* restrictions */}
            <p className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
              <Emblem icon="shield-alert" color="#c084fc" size={16} />
              Research Restrictions
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {RESTRICTION_OPTIONS.map((r) => {
                const on = policies.restrictions === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={on}
                    data-restrictions={r.id}
                    onClick={() => setPolicy("restrictions", r.id as RestrictionsId)}
                    title={`${r.name} — ${r.desc}`}
                    className={[
                      "rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
                      on
                        ? "border-violet-400/70 bg-violet-400/15 text-violet-200"
                        : "border-slate-700 text-slate-300 hover:border-violet-400/50 hover:text-violet-200",
                    ].join(" ")}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>

            {/* defense preference */}
            <p className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
              <Emblem icon="shield-check" color="#4ade80" size={16} />
              Defense Preference <span className="text-[9px] font-normal text-slate-500">(ship designs)</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {DEFENSE_PREFERENCE_OPTIONS.map((d) => {
                const on = policies.defense === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    data-defense-pref={d.id}
                    onClick={() => setPolicy("defense", d.id as DefensePreferenceId)}
                    title={`${d.name} — ${d.desc}`}
                    className={[
                      "rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
                      on
                        ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200"
                        : "border-slate-700 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200",
                    ].join(" ")}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- ascension perks ---- */}
          <div data-search-box className="rounded-xl border border-fuchsia-400/20 bg-slate-950/60 p-3.5">
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-fuchsia-200">
              <Emblem icon="atom" color="#e879f9" size={20} />
              Ascension Perks
              <span className="ml-auto rounded border border-fuchsia-400/30 bg-fuchsia-400/10 px-1.5 py-px text-[9.5px] font-bold tabular-nums text-fuchsia-100">
                {perks.size}/{perkSlots} slots
                {hasAscensionTheory ? " +Theory" : ""}
              </span>
            </p>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">
              One slot per finished tradition tree
              {hasAscensionTheory ? " plus one from Ascension Theory" : ""}.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ASCENSION_PERKS.map((p) => {
                const on = perks.has(p.id);
                const { ok, reason } = perkFits(p.id);
                const dlcBlocked = p.dlc != null && !dlcs.has(p.dlc);
                const disabled = !on && (!ok || dlcBlocked);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    data-perk={p.id}
                    onClick={() => togglePerk(p.id)}
                    title={`${p.name} — ${p.effect}${!on && reason ? ` (locked: ${reason})` : ""}`}
                    className={[
                      "flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-left transition-all",
                      on ? "shadow-md" : "",
                      disabled ? "cursor-not-allowed opacity-40" : "hover:brightness-125",
                    ].join(" ")}
                    style={{
                      borderColor: on ? `${p.color}aa` : "rgba(100,116,139,0.3)",
                      background: on ? `${p.color}1e` : "rgba(2,6,23,0.5)",
                    }}
                  >
                    <Emblem icon={p.icon} color={p.color} size={22} dim={!on} />
                    <span className="min-w-0">
                      <span
                        className="block max-w-[130px] truncate text-[10.5px] font-semibold leading-tight"
                        style={{ color: on ? p.color : "#cbd5e1" }}
                      >
                        {p.name}
                      </span>
                      <span className="block max-w-[130px] truncate text-[9px] leading-tight text-slate-400">
                        {p.effect}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
    </section>
  );
}
