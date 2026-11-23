"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RARITY_META, type DlcInfo } from "@/lib/techtree";

interface DlcFilterProps {
  dlcs: DlcInfo[];
  counts: Map<string, number>;
  acquiredByDlc: Map<string, number>;
  active: Set<string>;
  onToggle: (id: string) => void;
  onSetAll: (on: boolean) => void;
}

export function DlcFilter({
  dlcs,
  counts,
  acquiredByDlc,
  active,
  onToggle,
  onSetAll,
}: DlcFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
          DLC Filter
        </p>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          {dlcs.filter((d) => active.has(d.id)).length}/{dlcs.length} shown
        </span>
        <span className="text-[10.5px] italic text-slate-500">
          Base game techs are always shown
        </span>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => onSetAll(true)}
            className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onSetAll(false)}
            className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            None
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
        {dlcs.map((d) => {
          const total = counts.get(d.id) ?? 0;
          const done = acquiredByDlc.get(d.id) ?? 0;
          const on = active.has(d.id);
          return (
            <label
              key={d.id}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                on
                  ? "border-slate-700 bg-slate-900/80"
                  : "border-slate-800/60 bg-slate-950/40 opacity-60 hover:opacity-90",
              ].join(" ")}
            >
              <Checkbox
                checked={on}
                onCheckedChange={() => onToggle(d.id)}
                className="h-3.5 w-3.5 border-slate-500 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-400"
                aria-label={`Show ${d.name}`}
              />
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                style={{ background: d.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-medium text-slate-100">
                  {d.name}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {done}/{total} techs
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-800/70 pt-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
          Rarity
        </p>
        {([0, 1, 2] as const).map((r) => (
          <span
            key={r}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: RARITY_META[r].color,
                boxShadow: `0 0 6px ${RARITY_META[r].color}66`,
              }}
            />
            {RARITY_META[r].label}
          </span>
        ))}
        <span className="text-[10.5px] italic text-slate-500">
          Card background = research area (blue / green / yellow, purple =
          events) · border &amp; stripe = DLC · tint &amp; badge = rarity
        </span>
      </div>
    </div>
  );
}
