"use client";

import { memo } from "react";
import { Check, Flag, Lock, TriangleAlert, Zap } from "lucide-react";
import { BASE_PATH } from "@/lib/assetPath";
import {
  RARITY_META,
  TIER_COLORS,
  TRACE_NEXT_COLOR,
  bgOf,
  dlcOf,
  type Tech,
} from "@/lib/techtree";
import { formatOdds, type TechOdds } from "@/lib/myEmpire";
import { RATING_META, type PresetRating } from "@/lib/presets";

/**
 * self  — the traced card itself (bright white ring)
 * next  — direct unlock of the traced card (bright gold, animated)
 * ready — direct unlock of any researched tech (light persistent gold)
 */
export type CardHighlight = "self" | "next" | "ready";

interface TechCardProps {
  tech: Tech;
  acquired: boolean;
  /** permanently-known starting tech for the applied empire (padlock) */
  permanent?: boolean;
  /** tracing state: the traced card itself, one of its direct unlocks, or a lightly-marked unlock of a researched tech */
  highlight?: CardHighlight;
  /** brief attention pulse (used when redirecting to a missing prerequisite) */
  flash?: boolean;
  /** cannot be selected right now (missing prereqs / tier gate / empire lock) — strongly grayed out */
  blocked?: boolean;
  /** research-appearance odds (null = no badge, e.g. acquired/event techs) */
  odds?: TechOdds | null;
  /** render the odds badge? (global toggle) */
  showOdds?: boolean;
  /** playstyle rating of this tech (only while a preset is active) */
  rating?: PresetRating | null;
  /** on the planned path to the current goal (missing prerequisite) */
  planned?: boolean;
  /** this tech is the current path-planner goal */
  isGoal?: boolean;
  /** set / clear the path-planner goal (flag button on the card) */
  onSetGoal?: (key: string | null) => void;
  onToggle: (key: string) => void;
  onHover: (tech: Tech | null, el: HTMLElement | null) => void;
}

function TechCardInner({
  tech,
  acquired,
  permanent,
  highlight,
  flash,
  blocked,
  odds,
  showOdds,
  rating = null,
  planned = false,
  isGoal = false,
  onSetGoal,
  onToggle,
  onHover,
}: TechCardProps) {
  const dlc = dlcOf(tech);
  const isBase = tech.dlc === null;
  const rarity = RARITY_META[tech.rarity];
  const isNext = highlight === "next";
  const isSelf = highlight === "self";
  const isReady = highlight === "ready";
  const isStartTech = permanent === true;
  /* locked forever by the applied empire ("My Empire" tab) */
  const empireLocked = odds?.locked === true;
  const empireLockedReason = empireLocked ? odds?.blockedReason ?? null : null;
  const oddsBadge = showOdds && odds ? odds : null;
  /* cannot be selected right now — much dimmer than selectable techs */
  const isBlocked = blocked === true && !acquired;

  /* stable per-card pattern offset — each box shows a different slice of
     its area's star tile, so side-by-side cards never look identical */
  const patArea = tech.event ? "events" : tech.area;
  let patHash = 0;
  for (const ch of tech.key) patHash = (patHash * 31 + ch.charCodeAt(0)) | 0;
  const patX = Math.abs(patHash) % 192;
  const patY = (Math.abs(patHash) >>> 7) % 192;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={acquired}
      aria-label={`${tech.name} — ${isStartTech ? "starting technology, always researched" : acquired ? "researched" : isBlocked ? "not researchable yet" : "not researched"}`}
      title={
        isStartTech
          ? "Starting technology — permanently researched for the applied empire"
          : empireLockedReason
            ? `Locked — ${empireLockedReason}`
            : isBlocked
              ? `Locked — ${odds?.blockedReason ?? "prerequisites not yet researched"}`
              : undefined
      }
      data-tech-key={tech.key}
      onClick={() => onToggle(tech.key)}
      onMouseEnter={(e) => onHover(tech, e.currentTarget)}
      onMouseLeave={() => onHover(null, null)}
      onFocus={(e) => onHover(tech, e.currentTarget)}
      onBlur={() => onHover(null, null)}
      className={[
        "group relative flex w-full flex-row overflow-hidden rounded-lg border p-0 text-left transition-all duration-150",
        /* uniform fixed height — every tech box in every tier is the same size */
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
        /*
         * Dimming hierarchy (strongest cue for what is selectable):
         *   traced / acquired → full colour
         *   blocked           → near-grayscale, much dimmer (empire-locked worst)
         *   ready             → light gold-tinted
         *   plain selectable  → standard dim, clearly brighter than blocked
         */
        isSelf || isNext || acquired
          ? "opacity-100 saturate-100"
          : isBlocked
            ? empireLocked
              ? "opacity-70 saturate-[.08] brightness-[.38] hover:opacity-100 hover:saturate-[.28] hover:brightness-[.62]"
              : "opacity-80 saturate-[.12] brightness-[.46] hover:opacity-100 hover:saturate-[.32] hover:brightness-[.7]"
            : isReady
              ? "saturate-[.78] brightness-[.88] hover:saturate-100 hover:brightness-100"
              : "saturate-[.55] brightness-[.68] hover:saturate-[.9] hover:brightness-95",
        isNext ? "next-glow" : undefined,
        flash ? "redirect-flash" : undefined,
      ].join(" ")}
      style={{
        borderColor: empireLocked && !acquired
          ? "#fb718566"
          : isSelf
          ? "#f1f5f9"
          : isNext
            ? TRACE_NEXT_COLOR
            : isReady
              ? `${TRACE_NEXT_COLOR}80`
              : acquired
                ? dlc.color
                : `${dlc.color}59`,
        background: bgOf(tech),
        boxShadow: isSelf
          ? "0 0 0 2px rgba(241,245,249,.85), 0 0 24px rgba(241,245,249,.22)"
          : isNext
            ? undefined // handled by the animated .next-glow class
            : isReady
              ? `0 0 10px ${TRACE_NEXT_COLOR}26, inset 0 0 0 1px ${TRACE_NEXT_COLOR}1f`
              : acquired
                ? `0 0 0 2px rgba(52,211,153,.75), 0 0 18px ${dlc.color}8c, inset 0 0 0 1px rgba(52,211,153,.32)`
                : empireLocked
                  ? "inset 0 0 0 1px rgba(251,113,133,.22)"
                  : undefined,
      }}
    >
      {/* see-through star pattern — per-area tile, whisper-quiet so the
          text stays readable (icon/badges bring their own backing) */}
      <span
        aria-hidden
        className="tech-card-stars pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url(${BASE_PATH}/patterns/card-${patArea}.svg)`,
          backgroundPosition: `${patX}px ${patY}px`,
        }}
      />
      {/* rarity tint */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: rarity.tint }}
      />
      {/* DLC header stripe */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: dlc.color, opacity: acquired ? 1 : 0.55 }}
      />
      {/* DLC dot — top-right corner, tucked under the stripe (moved out of
          the badge row so the odds badge can own the bottom-right corner);
          shifts left when a playstyle rating chip occupies the corner */}
      {!isBase && (
        <span
          title={dlc.name}
          className={[
            "pointer-events-none absolute top-[4px] z-[5] h-2 w-2 rounded-full border border-white/25",
            rating ? "right-[21px]" : "right-[3px]",
          ].join(" ")}
          style={{ background: dlc.color }}
          aria-label={dlc.name}
        />
      )}

      {/* playstyle rating — top-right corner, only while a preset is
          active; S/A/B with the preset-relative meaning (see Help modal) */}
      {rating && (
        <span
          title={`${RATING_META[rating].label} pick — ${RATING_META[rating].title}`}
          className="pointer-events-none absolute right-[3px] top-[4px] z-[5] inline-flex h-3.5 min-w-[15px] items-center justify-center rounded-[3px] border px-[3px] text-[8.5px] font-extrabold leading-none"
          style={{
            color: RATING_META[rating].color,
            borderColor: `${RATING_META[rating].color}99`,
            background: `${RATING_META[rating].color}1f`,
            boxShadow:
              rating === "S" ? `0 0 6px ${RATING_META[rating].color}55` : undefined,
          }}
        >
          {rating}
        </span>
      )}

      {/* tech icon — a rail spanning the card's full height, flush with its
          left edge; the square icon renders as large as the rail allows */}
      <span
        aria-hidden
        className="relative flex w-[50px] shrink-0 items-center justify-center self-stretch border-r border-black/40 bg-black/35 transition-colors group-hover:border-slate-400/60"
      >
        <img
          src={`${BASE_PATH}/img/${tech.key}.png`}
          alt=""
          loading="lazy"
          decoding="async"
          width={50}
          height={50}
          className="h-full w-full object-contain p-[2px]"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {/* checkbox — overlaps the tech IMAGE at its bottom-right corner
            (padlock for permanently-known starting techs); sized to the
            visible square icon, which object-contain centers in the rail,
            so the badge always lands on the image corner. Its size is
            fixed and must stay unchanged. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[40px] top-[48px] z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors"
          style={{
            background: acquired ? "#34d399" : "rgba(2,6,23,0.85)",
            borderColor: acquired ? "#34d399" : "rgba(226,232,240,0.45)",
          }}
        >
          {isStartTech ? (
            <Lock className="h-2 w-2 text-slate-950" strokeWidth={4} />
          ) : (
            <Check
              className={[
                "h-2 w-2",
                acquired ? "text-slate-950" : "text-transparent",
              ].join(" ")}
              strokeWidth={4}
            />
          )}
        </span>
      </span>

      {/* name + badges — fill the width right of the icon rail; the name is
          vertically centered on the icon's center line, the badges hug the
          bottom edge with the bottom-right corner reserved for the odds */}
      <div className="relative min-w-0 flex-1 self-stretch">
        <div className="absolute inset-0 flex items-center overflow-hidden pl-1 pr-1.5">
          <p
            className="line-clamp-2 w-full min-w-0 rounded bg-[#020409]/30 px-0.5 py-0.5 text-[9.5px] font-medium leading-tight text-slate-50 backdrop-blur-[2.5px]"
            title={tech.name}
          >
            {tech.name}
          </p>
        </div>

        <div
          className={[
            "absolute bottom-[3px] left-0.5 flex flex-nowrap items-center gap-px overflow-hidden leading-none",
            oddsBadge ? "right-[42px]" : "right-2",
          ].join(" ")}
        >
        {isNext && (
          <span
            className="shrink-0 rounded px-0.5 py-px text-[8px] font-extrabold uppercase tracking-normal text-slate-950"
            style={{ background: TRACE_NEXT_COLOR }}
          >
            Next
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-px rounded border border-black/30 bg-black/25 px-[1.5px] py-px text-[8.5px] font-medium leading-none text-slate-100">
          <Zap className="h-2 w-2 text-cyan-300/90" aria-hidden />
          {tech.cost > 0 ? tech.cost.toLocaleString("en-US") : "Free"}
        </span>
        <span
          className="shrink-0 rounded border px-[1.5px] py-px text-[8.5px] font-semibold leading-none"
          style={{
            color: TIER_COLORS[tech.tier],
            borderColor: `${TIER_COLORS[tech.tier]}59`,
            background: `${TIER_COLORS[tech.tier]}17`,
          }}
        >
          {permanent || tech.tier === 0 ? "Start" : `T${tech.tier}`}
        </span>
        {tech.rarity > 0 && (
          <span
            title={`${rarity.label} technology`}
            className="inline-flex shrink-0 items-center rounded px-[1.5px] py-px"
            style={{ color: rarity.color, background: `${rarity.color}22` }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: rarity.color }}
              aria-hidden
            />
            {tech.rarity === 2 ? <span className="text-[8px] font-bold">U</span> : null}
          </span>
        )}
        {tech.event && (
          <span className="shrink-0 rounded bg-violet-400/20 px-0.5 py-px text-[8px] font-bold uppercase tracking-wide leading-none text-violet-200">
            Event
          </span>
        )}
        {tech.dangerous && (
          <span title="Dangerous technology" className="inline-flex shrink-0">
            <TriangleAlert className="h-2 w-2 text-rose-400" aria-hidden />
          </span>
        )}
        </div>
      </div>

      {/* research odds — bottom-right corner of the tech box (toggle:
          "Show odds"); taken out of the badge row so it always owns that
          corner, with the row reserving space above it */}
      {oddsBadge && (
        <span
          title={
            oddsBadge.locked
              ? `Locked — ${oddsBadge.blockedReason ?? "requirements not met"}`
              : oddsBadge.blocked
                ? `${oddsBadge.blockedReason ?? "Not drawable yet"} — odds shown as if it were available now`
                : `Chance to appear as one of the research options in ${tech.area}`
          }
          className={[
            "absolute bottom-[3px] right-[3px] z-[5] inline-flex items-center gap-0.5 rounded px-[3px] py-px text-[8.5px] font-extrabold leading-none",
            oddsBadge.locked
              ? "border border-rose-400/50 bg-rose-400/15 text-rose-200"
              : oddsBadge.blocked
                ? "border border-slate-600/60 bg-slate-900/60 italic text-slate-400"
                : "border border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
          ].join(" ")}
        >
          {oddsBadge.locked ? (
            <>
              <Lock className="h-2 w-2" aria-hidden />
              0%
            </>
          ) : (
            <>≈{formatOdds(oddsBadge.pct)}</>
          )}
        </span>
      )}

      {/* planned-path outline — dashed on every missing prerequisite of the
          goal; the goal card itself gets a solid amber ring instead */}
      {planned && !isGoal && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[6] rounded-lg border-[1.5px] border-dashed"
          style={{ borderColor: "#fcd34dcc" }}
        />
      )}
      {isGoal && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[6] rounded-lg border-2"
          style={{
            borderColor: "#fbbf24",
            boxShadow: "inset 0 0 14px rgba(251,191,36,.28)",
          }}
        />
      )}

      {/* path-planner flag — appears on hover at the top of the content
          column; click to plan a path here (or clear the goal). A span with
          role=button because the card itself is a <button> (no nesting). */}
      {onSetGoal && (
        <span
          role="button"
          tabIndex={-1}
          aria-hidden
          title={
            isGoal
              ? "Clear the planned goal"
              : `Plan a path to ${tech.name} — highlights every missing prerequisite`
          }
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSetGoal(isGoal ? null : tech.key);
          }}
          className={[
            "absolute left-[54px] top-[3px] z-[7] flex h-4 w-4 items-center justify-center rounded transition-colors",
            isGoal
              ? "text-amber-300"
              : "text-slate-400 opacity-0 hover:text-amber-300 focus-visible:opacity-100 group-hover:opacity-100",
          ].join(" ")}
        >
          <Flag className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

export const TechCard = memo(TechCardInner);
