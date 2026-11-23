"use client";

import { Dices } from "lucide-react";
import {
  AXIS_BY_KEY,
  ETHICS_COLOR,
  SPECIES_CLASS_BY_ID,
  type AxisKey,
} from "@/lib/empireData";
import type { GeneratedEmpire } from "@/lib/empireGen";

interface EmpireCardProps {
  empire: GeneratedEmpire;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onReroll: () => void;
}

export function EmpireCard({
  empire,
  index,
  selected,
  onSelect,
  onReroll,
}: EmpireCardProps) {
  const axis = AXIS_BY_KEY[empire.archetype];
  const className = SPECIES_CLASS_BY_ID[empire.speciesClass]?.name;
  const ethicsLabel =
    empire.ethics.length > 0
      ? empire.ethics.map((e) => e.name).join(" · ")
      : "Gestalt Consciousness";
  const ethicsColor =
    empire.ethics.length > 0
      ? ETHICS_COLOR[empire.ethics[0].axis]
      : "#f472b6";

  return (
    <div
      data-empire-index={index}
      className={[
        "group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all duration-150",
        selected
          ? "border-rose-400 bg-rose-400/10 shadow-[0_0_0_2px_rgba(251,113,133,.35)]"
          : "border-slate-700/70 bg-slate-900/70 hover:border-rose-400/50 hover:bg-slate-800/60",
      ].join(" ")}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <button
        type="button"
        aria-label="Reroll this empire"
        title="Reroll this empire"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded border border-slate-600/60 bg-slate-950/60 text-slate-400 opacity-0 transition-all hover:border-rose-400/60 hover:text-rose-300 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onReroll();
        }}
      >
        <Dices className="h-3 w-3" />
      </button>

      <p className="text-[8px] font-extrabold uppercase tracking-[0.18em] text-rose-300/60">
        Empire
      </p>
      <p
        className="pr-7 text-[12.5px] font-bold leading-tight text-slate-50"
        title={empire.name}
      >
        {empire.name}
      </p>

      <span
        className="inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide"
        style={{ color: axis.color, background: `${axis.color}1f` }}
      >
        {axis.short}
      </span>

      <p
        className="truncate text-[10.5px] text-slate-300"
        title={`${empire.species}${className ? ` (${className})` : ""}`}
      >
        <span className="font-bold uppercase tracking-wide text-slate-500">Species:</span>{" "}
        <span className="font-semibold text-slate-100">{empire.species}</span>
        {className && <span className="text-slate-400"> · {className}</span>}
      </p>

      <p
        className="truncate text-[10.5px] font-medium"
        style={{ color: `${ethicsColor}dd` }}
        title={ethicsLabel}
      >
        {ethicsLabel}
      </p>

      <p className="truncate text-[10.5px] text-slate-300" title={empire.civics.map((c) => c.name).join(" / ")}>
        <span className="text-slate-400">{empire.authority.name}</span>
        {" · "}
        {empire.civics.map((c) => c.name).join(" / ")}
      </p>

      <p className="truncate text-[10.5px] text-slate-400">
        {empire.origin.name} · {empire.homeworld} homeworld
      </p>
    </div>
  );
}
