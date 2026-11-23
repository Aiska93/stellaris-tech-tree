"use client";

import { useEffect } from "react";
import { Check, Clock, Lock, TriangleAlert, X } from "lucide-react";
import { BASE_PATH } from "@/lib/assetPath";
import {
  AREA_META,
  RARITY_META,
  TIER_COLORS,
  TIER_LABELS,
  dlcOf,
  prereqTechs,
  type Tech,
} from "@/lib/techtree";
import { formatOdds, type TechOdds } from "@/lib/myEmpire";
import { RATING_META, type PresetRating } from "@/lib/presets";

interface TechTooltipProps {
  tech: Tech;
  rect: DOMRect;
  acquired: Set<string>;
  /** research-appearance odds, if computed for this tech */
  odds?: TechOdds | null;
  /** render the odds breakdown? (global toggle; lock reasons always show) */
  showOdds?: boolean;
  /** permanently-known starting tech for the applied empire */
  permanent?: boolean;
  /** why it is permanent (null = every empire knows it) */
  permanentNote?: string | null;
  /** requirement not met for the current (or default) empire — locks the tech */
  lockReason?: string | null;
  /** playstyle rating while a preset is active */
  rating?: PresetRating | null;
  /** name of the active playstyle preset (for the rating note) */
  presetName?: string | null;
  /** monthly research output for this tech's area (null = not entered) */
  monthlyRate?: number | null;
  onDismiss: () => void;
}

export function TechTooltip({
  tech,
  rect,
  acquired,
  odds,
  showOdds = true,
  permanent,
  permanentNote,
  lockReason,
  rating = null,
  presetName = null,
  monthlyRate = null,
  onDismiss,
}: TechTooltipProps) {
  const dlc = dlcOf(tech);
  const rarity = RARITY_META[tech.rarity];
  const prereqs = prereqTechs(tech);
  const missingPrereqs = prereqs.filter((p) => !acquired.has(p.key));
  const locked = !acquired.has(tech.key) && missingPrereqs.length > 0;
  const unlocks = tech.unlocks.slice(0, 6);
  const moreUnlocks = tech.unlocks.length - unlocks.length;

  // flip horizontally when close to the right edge
  const W = 300;
  const flip = typeof window !== "undefined" && rect.right + W + 24 > window.innerWidth;
  const left = flip ? Math.max(8, rect.left - W - 12) : rect.right + 12;
  const top = Math.min(
    Math.max(8, rect.top - 12),
    (typeof window !== "undefined" ? window.innerHeight : 900) - 380,
  );

  // dismiss on scroll/resize so it never floats away from its card
  useEffect(() => {
    const hide = () => onDismiss();
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [onDismiss]);

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-[300px] rounded-xl border border-slate-600/80 bg-[#0b1120]/85 p-3 shadow-2xl shadow-black/60 backdrop-blur-md"
      style={{ left, top }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl"
        style={{ background: dlc.color }}
      />
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-slate-700/70 bg-slate-950/90 p-1.5 shadow-inner"
        >
          <img
            src={`${BASE_PATH}/img/${tech.key}.png`}
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="pr-5 text-sm font-semibold leading-tight text-slate-50">
            {tech.name}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color: AREA_META[tech.area].color,
                background: `${AREA_META[tech.area].color}1c`,
              }}
            >
              {AREA_META[tech.area].label}
            </span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
              {tech.cat}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: TIER_COLORS[tech.tier],
                background: `${TIER_COLORS[tech.tier]}1f`,
              }}
            >
              {TIER_LABELS[tech.tier]}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: rarity.color, background: `${rarity.color}1f` }}
            >
              {rarity.label}
            </span>
            {tech.dlc ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ color: dlc.color, background: `${dlc.color}1c` }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: dlc.color }}
                />
                {dlc.name}
              </span>
            ) : (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                Base Game
              </span>
            )}
          </div>
        </div>
      </div>
      <span
        role="button"
        tabIndex={-1}
        onClick={onDismiss}
        className="absolute right-2 top-2 text-slate-500"
        aria-hidden
      >
        <X className="h-3.5 w-3.5" />
      </span>

      {tech.dangerous && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300">
          <TriangleAlert className="h-3 w-3" />
          Dangerous technology
        </p>
      )}

      {locked && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300">
          <Lock className="h-3 w-3" />
          Locked — research the missing prerequisites first
        </p>
      )}

      {/* requirement not met — locked for the current / default empire */}
      {lockReason && (
        <p className="mt-2 flex items-start gap-1.5 rounded border border-rose-400/40 bg-rose-400/10 px-2 py-1.5 text-[11px] font-semibold leading-snug text-rose-200">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {acquired.has(tech.key)
              ? `Locked — ${lockReason}. Uncheck it to remove it from your progress.`
              : `Locked — ${lockReason}`}
          </span>
        </p>
      )}

      {/* research odds — shown when the "Show odds" toggle is on */}
      {showOdds && odds && !odds.locked && odds.pct != null && (
        <div className="mt-2 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-1.5">
          <p className="text-[11px] font-semibold text-cyan-100">
            Draw odds ≈ {formatOdds(odds.pct)}
            <span className="ml-1 font-medium text-cyan-200/70">
              per research choice
            </span>
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-300">
            Weight {odds.baseWeight}
            {odds.mult !== 1 &&
              ` × ${odds.mult.toFixed(2).replace(/\.?0+$/, "")}`}
            {odds.notes.length > 0 && ` — ${odds.notes.join(", ")}`}
          </p>
          {odds.blocked && odds.blockedReason && (
            <p className="mt-0.5 text-[10px] leading-snug text-amber-300/90">
              Not drawable yet: {odds.blockedReason}. Odds shown as if it were available now.
            </p>
          )}
        </div>
      )}

      {permanent && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
          <Lock className="h-3 w-3" />
          Starting technology —{" "}
          {permanentNote ?? "every empire knows it"}
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
        <span>
          Cost:{" "}
          <span className="font-medium text-slate-100">
            {tech.cost > 0 ? `${tech.cost.toLocaleString("en-US")} pts` : "Starting"}
          </span>
        </span>
        <span>
          <span className="border-b border-dotted border-slate-500" title="Each tech's hidden pull in the research-option draw — higher weight means it appears more often">
            Weight:
          </span>{" "}
          <span className="font-medium text-slate-100">
            {tech.weight > 0 ? tech.weight : "—"}
          </span>
        </span>
      </div>

      {/* research-time estimate — from the monthly output entered in My Empire */}
      {monthlyRate != null && monthlyRate > 0 && !acquired.has(tech.key) && tech.cost > 0 && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
          <Clock className="h-3 w-3" aria-hidden />
          ≈ {Math.ceil(tech.cost / monthlyRate)} months at{" "}
          {monthlyRate}/mo {AREA_META[tech.area].label}
        </p>
      )}

      {/* playstyle rating note — only while a preset is active */}
      {rating && (
        <p
          className="mt-1.5 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold"
          style={{
            color: RATING_META[rating].color,
            borderColor: `${RATING_META[rating].color}55`,
            background: `${RATING_META[rating].color}12`,
          }}
        >
          <span
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-1 text-[9px] font-extrabold"
            style={{
              color: RATING_META[rating].color,
              borderColor: `${RATING_META[rating].color}99`,
            }}
          >
            {rating}
          </span>
          {RATING_META[rating].label} pick for {presetName}
        </p>
      )}

      {prereqs.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Requires{" "}
            {missingPrereqs.length > 0 && (
              <span className="font-bold normal-case tracking-normal text-rose-400">
                · {missingPrereqs.length} of {prereqs.length} missing
              </span>
            )}
          </p>
          <ul className="mt-1 space-y-0.5">
            {prereqs.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-1.5 text-[11px] text-slate-200"
              >
                {acquired.has(p.key) ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                ) : (
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-sm border border-slate-600"
                  />
                )}
                <span className={acquired.has(p.key) ? "text-slate-400 line-through" : ""}>
                  {p.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tech.desc && (
        <p className="mt-2 line-clamp-4 border-t border-slate-800 pt-2 text-[11.5px] italic leading-relaxed text-slate-300">
          {tech.desc}
        </p>
      )}

      {unlocks.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Unlocks
          </p>
          <ul className="mt-1 space-y-0.5">
            {unlocks.map((u) => (
              <li key={u} className="text-[11px] leading-snug text-emerald-100/90">
                • {u}
              </li>
            ))}
            {moreUnlocks > 0 && (
              <li className="text-[11px] text-slate-400">
                +{moreUnlocks} more…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
