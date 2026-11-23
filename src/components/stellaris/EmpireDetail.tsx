"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Crown, Dices, Lock, Send } from "lucide-react";
import {
  AXES,
  AXIS_BY_KEY,
  AUTHORITIES,
  CIVICS,
  CIVIC_POINTS,
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
  renameEmpire,
  toggleCivic,
  toggleTrait,
  traitFits,
  traitPicksUsed,
  traitPointsUsed,
  type GeneratedEmpire,
} from "@/lib/empireGen";

interface EmpireDetailProps {
  empire: GeneratedEmpire;
  /** apply an edited empire (manual picks) */
  onChange: (next: GeneratedEmpire) => void;
  onReroll: () => void;
  /** send this empire to the "My Empire" tab (applies it to the tech tree) */
  onSend?: () => void;
  /** active DLC ids (tree + empire packs) — controls which options are offered */
  dlcs: Set<string>;
}

/* ------------------------------------------------------------------ */
/* small building blocks                                               */
/* ------------------------------------------------------------------ */

export function GroupTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 flex flex-wrap items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {children}
      </p>
      {right}
    </div>
  );
}

export function PointsBadge({ used, max, extra }: { used: number; max: number; extra?: string }) {
  const full = used >= max;
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[9.5px] font-bold",
        full
          ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
          : "border-slate-700 bg-slate-900/70 text-slate-300",
      ].join(" ")}
    >
      {used}/{max} pts{extra ? ` · ${extra}` : ""}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[11.5px]">
      <span className="w-[76px] shrink-0 font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export const inputBase =
  "h-8 rounded-md border border-slate-700 bg-slate-900/70 px-2 text-[12px] font-medium text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none";
export const inputCls = `${inputBase} w-full`;
export const selectBase =
  "h-8 rounded-md border border-slate-700 bg-slate-900/70 px-1.5 text-[11.5px] font-medium text-slate-100 focus:border-amber-400/60 focus:outline-none";
export const selectCls = `${selectBase} w-full`;

interface ChipProps {
  label: string;
  on: boolean;
  locked?: boolean;
  lockedReason?: string;
  disabled?: boolean;
  disabledReason?: string;
  costLabel?: string;
  tone: "cyan" | "emerald" | "rose" | "violet";
  onClick: () => void;
}

const TONE_ON: Record<ChipProps["tone"], string> = {
  cyan: "border-cyan-300/60 bg-cyan-400/15 text-cyan-100",
  emerald: "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
  rose: "border-rose-400/50 bg-rose-400/15 text-rose-100",
  violet: "border-violet-400/50 bg-violet-400/15 text-violet-100",
};

const TONE_OFF: Record<ChipProps["tone"], string> = {
  cyan: "border-slate-700 bg-transparent text-slate-300 hover:border-cyan-300/50 hover:text-cyan-100",
  emerald:
    "border-slate-700 bg-transparent text-slate-300 hover:border-emerald-400/50 hover:text-emerald-100",
  rose: "border-slate-700 bg-transparent text-slate-300 hover:border-rose-400/50 hover:text-rose-200",
  violet:
    "border-slate-700 bg-transparent text-slate-300 hover:border-violet-400/50 hover:text-violet-200",
};

export function Chip({
  label,
  on,
  locked,
  lockedReason,
  disabled,
  disabledReason,
  costLabel,
  tone,
  onClick,
}: ChipProps) {
  const title = locked
    ? `Required — ${lockedReason ?? "this empire cannot exist without it"}`
    : disabled
      ? (disabledReason ?? "Unavailable")
      : undefined;
  return (
    <button
      type="button"
      onClick={locked || disabled ? undefined : onClick}
      aria-pressed={on}
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
        on ? TONE_ON[tone] : TONE_OFF[tone],
        locked || disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
        locked ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100 opacity-100" : "",
      ].join(" ")}
    >
      {locked && <Lock className="h-2.5 w-2.5 shrink-0 text-emerald-300" aria-hidden />}
      {label}
      {costLabel && (
        <span
          className={[
            "rounded px-1 py-px text-[8.5px] font-extrabold",
            on || locked
              ? "bg-black/30 text-slate-200"
              : "bg-slate-800/80 text-slate-400",
          ].join(" ")}
        >
          {costLabel}
        </span>
      )}
    </button>
  );
}

export function costText(cost: number): string {
  if (cost > 0) return `+${cost}`;
  return `−${Math.abs(cost)}`;
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export function EmpireDetail({ empire, onChange, onReroll, onSend, dlcs }: EmpireDetailProps) {
  const [modsOpen, setModsOpen] = useState(true);
  const axis = AXIS_BY_KEY[empire.archetype];
  const totalMods = empire.modifiers.reduce((n, g) => n + g.items.length, 0);
  const gestalt = empire.authority.gestalt;

  const dlcOk = (x: { dlc: string | null }) => !x.dlc || dlcs.has(x.dlc);
  const lockedCivics = mandatoryCivicIds(empire);
  const lockedTraits = mandatoryTraitIdsOf(empire);
  const civicLeft = CIVIC_POINTS - civicPointsUsed(empire);
  const traitLeft = TRAIT_POINTS - traitPointsUsed(empire);
  const picksLeft = TRAIT_PICKS - traitPicksUsed(empire);
  const currentClass = SPECIES_CLASS_BY_ID[empire.speciesClass] ?? SPECIES_CLASS_BY_ID.humanoid;

  /* option lists --------------------------------------------------- */

  const authorityOptions = AUTHORITIES.filter(
    (a) => a.id === empire.authority.id || dlcOk(a),
  );

  const classOptions = SPECIES_CLASSES.filter(
    (c) => c.id === empire.speciesClass || dlcOk(c),
  );

  const originOptions = ORIGINS.filter(
    (o) => o.id === empire.origin.id || dlcOk(o),
  );

  const ethicsAxes = new Set(empire.ethics.map((e) => e.axis));
  const civicCtx = {
    gestalt,
    corporate: empire.authority.corporate,
    ethicsAxes,
    speciesClass: empire.speciesClass,
  };

  const civicChips: { c: Civic; on: boolean; locked: boolean; disabled: boolean; reason: string }[] =
    [];
  for (const c of CIVICS) {
    const on = empire.civics.some((x) => x.id === c.id);
    const locked = lockedCivics.has(c.id);
    if (!locked) {
      const fits = civicFits(c, civicCtx);
      // ethics-locked and species-locked civics stay visible (dimmed) so the
      // requirement is discoverable
      const ethicsLocked =
        !fits && !gestalt && c.req?.ethicsAny != null && !c.req.corporate;
      const speciesLocked =
        !fits && (c.requiresTraits ?? []).some((id) =>
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

  const traitChips: { t: Trait; on: boolean; locked: boolean; disabled: boolean; reason: string }[] =
    [];
  for (const t of TRAITS) {
    const on = empire.traits.some((x) => x.id === t.id);
    const locked = lockedTraits.has(t.id);
    if (!locked) {
      if (!traitFits(t, empire.authority)) continue;
      // Latent Psionic only exists through the Teachers of the Shroud origin
      if (t.id === "latent_psionic" && !on) continue;
      // portrait class traits are managed through the Species dropdown
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

  /* ethic state per axis -------------------------------------------- */

  const ethicState = (axisId: string): 0 | 1 | 2 => {
    const e = empire.ethics.find((x) => x.axis === axisId);
    if (!e) return 0;
    return e.fanatic ? 2 : 1;
  };
  const regularEthicName = (axisId: string) =>
    ETHICS.find((e) => e.axis === axisId && !e.fanatic)!.name;

  return (
    <div
      data-empire-detail
      data-search-box
      className="rounded-xl border border-rose-400/25 bg-slate-950/70 p-4 shadow-xl shadow-black/30 backdrop-blur-sm"
    >
      {/* header — the generated name is read-only; reroll to change it */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 pb-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 px-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-rose-300/80">
            <Crown className="h-3 w-3 shrink-0" aria-hidden />
            Empire name
          </p>
          <p
            className="truncate px-1.5 text-lg font-bold leading-tight text-slate-50"
            style={{ fontFamily: "var(--font-orbitron)" }}
            title={`${empire.name} — generated name; hit Reroll for a new one`}
          >
            {empire.name}
          </p>
          <p className="truncate px-1.5 text-[11px] leading-snug text-slate-400">
            <span className="font-bold uppercase tracking-wide text-slate-500">
              Species:
            </span>{" "}
            <span className="font-semibold text-slate-100">{empire.species}</span>
            <span className="text-slate-400"> · {currentClass.name}</span>
          </p>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: axis.color, background: `${axis.color}22`, border: `1px solid ${axis.color}55` }}
        >
          {axis.label}
        </span>
        <button
          type="button"
          onClick={onReroll}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-rose-400/60 hover:text-rose-300"
        >
          <Dices className="h-3.5 w-3.5" />
          Reroll
        </button>
        {onSend && (
          <button
            type="button"
            onClick={onSend}
            data-send-to-my-empire
            title="Copy this empire's settings to the My Empire tab and apply them to the tech tree"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-400/20 hover:text-amber-100"
          >
            <Send className="h-3.5 w-3.5" />
            Send to My Empire
          </button>
        )}
      </div>

      <p className="mt-2.5 text-[12px] leading-relaxed text-slate-300">
        {empire.summary}
      </p>

      <div className="mt-3 grid gap-x-8 gap-y-1 lg:grid-cols-2">
        {/* ---------------- editor column ---------------- */}
        <div className="min-w-0 border-slate-800 lg:border-r lg:pr-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-rose-300/80">
            Empire Setup{" "}
            <span className="font-medium normal-case tracking-normal text-slate-400">
              · click chips to change ·{" "}
              <Lock className="inline h-2.5 w-2.5 text-emerald-300" aria-hidden />{" "}
              = required for this empire
            </span>
          </p>

          <div className="mt-1.5">
            <Field label="Species">
              <span className="flex flex-wrap gap-1.5">
                {empire.authority.gestalt === "machine" ? (
                  <span
                    title="A Machine Intelligence is always a Machine species"
                    className="inline-flex w-[124px] shrink-0 cursor-not-allowed items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-[11.5px] font-semibold text-slate-300"
                  >
                    <Lock className="h-2.5 w-2.5 text-emerald-300" aria-hidden />
                    {currentClass.name}
                  </span>
                ) : (
                  <select
                    value={empire.speciesClass}
                    onChange={(e) =>
                      onChange(changeSpeciesClass(empire, e.target.value, dlcs))
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
                <input
                  value={empire.species}
                  onChange={(e) =>
                    onChange(renameEmpire(empire, { species: e.target.value }))
                  }
                  aria-label="Species name"
                  className={`${inputBase} min-w-[80px] flex-1`}
                />
                <input
                  value={empire.speciesAdj}
                  onChange={(e) =>
                    onChange(renameEmpire(empire, { speciesAdj: e.target.value }))
                  }
                  aria-label="Species adjective"
                  title="Species adjective — used in the empire name"
                  className={`${inputBase} w-24 shrink-0`}
                />
              </span>
            </Field>

            <Field label="Authority">
              <select
                value={empire.authority.id}
                onChange={(e) => onChange(changeAuthority(empire, e.target.value, dlcs))}
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
                value={empire.origin.id}
                onChange={(e) => onChange(changeOrigin(empire, e.target.value))}
                className={selectCls}
                aria-label="Origin"
              >
                {originOptions.map((o) => {
                  const fits =
                    o.id === empire.origin.id ||
                    originFits(o, gestalt, empire.speciesClass);
                  return (
                    <option key={o.id} value={o.id} disabled={!fits}>
                      {o.name}
                      {o.req?.gestalt === "hive" && !fits ? " (needs Hive Mind)" : ""}
                      {o.req?.gestalt === "machine" && !fits ? " (needs Machine Intelligence)" : ""}
                      {o.req?.notGestalt && !fits ? " (non-gestalt only)" : ""}
                      {o.requiresTraits?.includes("lithoid") && !fits ? " (needs Lithoid species)" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Homeworld">
              {empire.origin.homeworld ? (
                <span
                  title={`Forced by the ${empire.origin.name} origin`}
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-[11.5px] font-semibold text-slate-300"
                >
                  <Lock className="h-2.5 w-2.5 text-emerald-300" aria-hidden />
                  {empire.origin.homeworld}
                </span>
              ) : (
                <select
                  value={empire.homeworld}
                  onChange={(e) => onChange(changeHomeworld(empire, e.target.value))}
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
          </div>

          {/* ethics */}
          <GroupTitle
            right={
              gestalt ? undefined : (
                <PointsBadge used={ethicPointsUsed(empire)} max={ETHIC_POINTS} />
              )
            }
          >
            Ethics
          </GroupTitle>
          {gestalt ? (
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-fuchsia-400/50 bg-fuchsia-400/15 px-2 py-1 text-[11px] font-semibold text-fuchsia-200">
              <Lock className="h-2.5 w-2.5" aria-hidden />
              Gestalt Consciousness — a hive/machine mind has no ethics
            </span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {Object.keys(ETHICS_COLOR).map((axisId) => {
                const state = ethicState(axisId);
                const color = ETHICS_COLOR[axisId];
                const label =
                  state === 2 ? `Fanatic ${regularEthicName(axisId)}` : regularEthicName(axisId);
                return (
                  <button
                    key={axisId}
                    type="button"
                    onClick={() => onChange(changeEthic(empire, axisId))}
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
          <GroupTitle right={<PointsBadge used={civicPointsUsed(empire)} max={CIVIC_POINTS} />}>
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
                onClick={() => onChange(toggleCivic(empire, c.id))}
              />
            ))}
          </span>

          {/* traits */}
          <GroupTitle
            right={
              <PointsBadge
                used={traitPointsUsed(empire)}
                max={TRAIT_POINTS}
                extra={`${traitPicksUsed(empire)}/${TRAIT_PICKS} picks`}
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
                    lockedReason={lockReasonFor(t.id, empire)}
                    disabled={disabled}
                    disabledReason={reason}
                    costLabel="class"
                    tone="violet"
                    onClick={() => onChange(toggleTrait(empire, t.id))}
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
                  lockedReason={lockReasonFor(t.id, empire)}
                  disabled={disabled}
                  disabledReason={reason}
                  costLabel={costText(t.cost)}
                  tone="emerald"
                  onClick={() => onChange(toggleTrait(empire, t.id))}
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
                  lockedReason={lockReasonFor(t.id, empire)}
                  disabled={disabled}
                  disabledReason={reason}
                  costLabel={costText(t.cost)}
                  tone="rose"
                  onClick={() => onChange(toggleTrait(empire, t.id))}
                />
              ))}
            </span>
          </span>
        </div>

        {/* ---------------- statistics column ---------------- */}
        <div className="mt-4 min-w-0 lg:mt-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Statistics
          </p>
          <div className="space-y-1.5">
            {AXES.map((a) => {
              const v = empire.ratings[a.key];
              return (
                <div key={a.key} className="flex items-center gap-2">
                  <span className="w-[72px] shrink-0 text-[10.5px] font-medium text-slate-300">
                    {a.short}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800/90">
                    <span
                      className="block h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${v * 10}%`,
                        background: `linear-gradient(to right, ${a.color}88, ${a.color})`,
                        boxShadow: `0 0 8px ${a.color}66`,
                      }}
                    />
                  </span>
                  <span className="w-5 shrink-0 text-right text-[10.5px] font-bold" style={{ color: a.color }}>
                    {v}
                  </span>
                </div>
              );
            })}
          </div>

          {/* modifiers */}
          <button
            type="button"
            onClick={() => setModsOpen((o) => !o)}
            aria-expanded={modsOpen}
            className="mt-3 flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-200"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${modsOpen ? "" : "-rotate-90"}`}
            />
            Key modifiers
            <span className="font-medium normal-case tracking-normal text-slate-500">
              ({totalMods})
            </span>
          </button>
          {modsOpen && (
            <div className="mt-1.5 space-y-2">
              {empire.modifiers.map((g) => (
                <div key={g.source}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300/80">
                    {g.source}
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {g.items.map((m, i) => (
                      <li key={i} className="text-[11px] leading-snug text-slate-300">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** why is this trait locked? human-readable reason for the tooltip */
function lockReasonFor(traitId: string, empire: GeneratedEmpire): string {
  switch (traitId) {
    case "mechanical":
      return "Machine Intelligence pops are mechanical";
    case "lithoid":
      return empire.origin.requiresTraits?.includes("lithoid")
        ? `the ${empire.origin.name} origin (lithoid species)`
        : "the Lithoid species class";
    case "plantoid":
      return empire.civics.some((c) => c.requiresTraits?.includes("plantoid"))
        ? "the Idyllic Bloom civic (plantoid species)"
        : "the Plantoid species class";
    case "latent_psionic":
      return "the Teachers of the Shroud origin";
    default:
      return "this empire's setup";
  }
}
