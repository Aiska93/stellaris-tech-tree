"use client";

import {
  Bot,
  Brain,
  ChevronDown,
  Coins,
  Compass,
  Cpu,
  Dna,
  Flag,
  FlaskConical,
  Globe2,
  GraduationCap,
  Handshake,
  Landmark,
  Locate,
  Radiation,
  Sprout,
  Swords,
  TowerControl,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  PLAYSTYLE_PRESETS,
  RATING_META,
  type PresetRating,
} from "@/lib/presets";
import type { Area } from "@/lib/techtree";

const ICONS: Record<string, LucideIcon> = {
  flask: FlaskConical,
  globe: Globe2,
  swords: Swords,
  sprout: Sprout,
  grad: GraduationCap,
  brain: Brain,
  bot: Bot,
  dna: Dna,
  landmark: Landmark,
  coins: Coins,
  handshake: Handshake,
  cpu: Cpu,
  radiation: Radiation,
  tower: TowerControl,
};

export interface NextUpSuggestion {
  key: string;
  name: string;
  area: Area;
  cost: number;
  rating: PresetRating;
  /** estimated research months (null = no rate entered) */
  months: number | null;
}

export interface GoalInfo {
  key: string;
  name: string;
  remaining: number;
  totalCost: number;
}

function RatingChip({ rating }: { rating: PresetRating }) {
  const meta = RATING_META[rating];
  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-1 text-[9px] font-extrabold leading-none"
      style={{
        color: meta.color,
        borderColor: `${meta.color}99`,
        background: `${meta.color}1f`,
      }}
    >
      {rating}
    </span>
  );
}

/**
 * Playstyle preset chooser — lives directly below the tab bar. While a
 * preset is active, its rated techs show rating icons in the tree, and the
 * "Next up" strip recommends the best currently available picks. The path
 * planner's goal banner shares the row.
 */
export function PresetBar({
  activeId,
  onSelect,
  goal,
  onClearGoal,
  onViewGoal,
  nextUp,
  onLocate,
}: {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  goal: GoalInfo | null;
  onClearGoal: () => void;
  onViewGoal: (key: string) => void;
  nextUp: NextUpSuggestion[];
  onLocate: (key: string) => void;
}) {
  const preset = PLAYSTYLE_PRESETS.find((p) => p.id === activeId) ?? null;

  return (
    <div className="mb-4 rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
          <Compass className="h-3.5 w-3.5 text-slate-500" />
          Playstyle
        </span>

        {/* None + preset pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={activeId === null}
            className={[
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              activeId === null
                ? "border-slate-500 bg-slate-700/60 text-white"
                : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white",
            ].join(" ")}
          >
            None
          </button>
          {PLAYSTYLE_PRESETS.map((p) => {
            const Icon = ICONS[p.icon] ?? Compass;
            const active = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(active ? null : p.id)}
                aria-pressed={active}
                title={`${p.tagline}${p.dlcNote ? ` — signature techs from ${p.dlcNote}` : ""}`}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "text-slate-50"
                    : "border-slate-800 text-slate-400 hover:text-white",
                ].join(" ")}
                style={
                  active
                    ? {
                        borderColor: `${p.color}99`,
                        background: `${p.color}24`,
                        color: p.color,
                      }
                    : undefined
                }
              >
                <Icon className="h-3 w-3" />
                {p.name}
                {p.dlcNote && (
                  <span
                    className="text-[9px] font-semibold uppercase opacity-60"
                    title={`Signature techs from ${p.dlcNote}`}
                  >
                    DLC
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* path-planner goal banner */}
        {goal && (
          <div
            className="ml-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/45 bg-amber-400/10 pl-2.5 pr-1"
            data-goal-banner
          >
            <Flag className="h-3 w-3 shrink-0 text-amber-300" />
            <span className="truncate text-[11px] leading-tight text-slate-200">
              Goal:{" "}
              <button
                type="button"
                onClick={() => onViewGoal(goal.key)}
                className="font-semibold text-amber-200 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-100"
              >
                {goal.name}
              </button>
              {" · "}
              <span className="font-semibold text-slate-100">
                {goal.remaining} {goal.remaining === 1 ? "tech" : "techs"}
              </span>
              {" to go · "}
              <span className="font-semibold text-slate-100">
                {goal.totalCost.toLocaleString("en-US")} pts
              </span>
            </span>
            <button
              type="button"
              onClick={onClearGoal}
              aria-label="Clear goal"
              title="Clear the planned path"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700/80 text-slate-400 transition-colors hover:border-amber-300/60 hover:text-amber-200"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* active preset tagline + next-up suggestions */}
      {preset && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800/60 pt-1.5">
          <p className="max-w-full text-[10.5px] italic text-slate-400 lg:max-w-md">
            {preset.tagline}
            {preset.dlcNote && (
              <span className="ml-1 not-italic text-slate-500">
                ({preset.dlcNote})
              </span>
            )}
          </p>
          {nextUp.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Next up
              </span>
              {nextUp.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onLocate(s.key)}
                  title={`Show ${s.name} in the tree${s.months ? ` — ≈${s.months} months at your rate` : ""}`}
                  className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-900/70 py-0.5 pl-1.5 pr-2 text-[10.5px] font-medium text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-white"
                >
                  <RatingChip rating={s.rating} />
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-[9.5px] font-semibold text-slate-500">
                    {s.months != null ? `≈${s.months}mo` : `${(s.cost / 1000).toFixed(s.cost % 1000 === 0 ? 0 : 1)}k`}
                  </span>
                  <Locate className="h-3 w-3 shrink-0 text-cyan-300/70" />
                </button>
              ))}
            </div>
          )}
          {nextUp.length === 0 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-300/80">
              <ChevronDown className="h-3 w-3" />
              All rated techs for this path are researched — nice.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
