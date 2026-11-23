"use client";

import { useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import { MILESTONES, MILESTONE_GROUPS } from "@/lib/milestones";
import { Term } from "./Term";

/**
 * Early-game milestone checklist — non-tech habits that decide the first
 * decades. Collapsible; checked state is persisted per slot by the parent.
 */
export function MilestonePanel({
  done,
  onToggle,
}: {
  done: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = MILESTONES.length;
  const doneCount = MILESTONES.filter((m) => done.has(m.id)).length;

  return (
    <div
      data-milestone-panel
      className="mb-6 rounded-xl border border-slate-800/80 bg-slate-950/50"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-left"
      >
        <ListChecks className="h-4 w-4 shrink-0 text-emerald-300" />
        <span className="text-[13px] font-semibold text-slate-100">
          Early-game milestones
        </span>
        <span
          className="rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
          style={{
            color: doneCount === total ? "#34d399" : "#93c5fd",
            borderColor:
              doneCount === total ? "#34d39955" : "#93c5fd44",
            background: doneCount === total ? "#34d39912" : "#93c5fd10",
          }}
        >
          {doneCount}/{total} done
        </span>
        <span className="text-[10.5px] text-slate-500">
          the habits that decide the first 30 years
        </span>
        <ChevronDown
          className={[
            "ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="grid gap-x-5 gap-y-1 border-t border-slate-800/70 px-3.5 py-3 sm:grid-cols-2 xl:grid-cols-3">
          {MILESTONE_GROUPS.map((group) => {
            const items = MILESTONES.filter((m) => m.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group}
                </p>
                <ul className="space-y-1.5">
                  {items.map((m) => {
                    const checked = done.has(m.id);
                    return (
                      <li key={m.id} className="min-w-0">
                        <label className="group/check flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggle(m.id)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-emerald-400"
                          />
                          <span className="min-w-0">
                            <span
                              className={[
                                "text-[11.5px] font-medium leading-snug",
                                checked
                                  ? "text-slate-500 line-through"
                                  : "text-slate-200",
                              ].join(" ")}
                            >
                              {m.title}
                            </span>{" "}
                            <span className="whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-wide text-amber-300/70">
                              {m.when}
                            </span>
                            <span
                              className={[
                                "mt-0.5 block text-[10.5px] leading-snug",
                                checked ? "text-slate-600" : "text-slate-400",
                              ].join(" ")}
                            >
                              {m.note}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="text-[10px] leading-snug text-slate-500 sm:col-span-2 xl:col-span-3">
            Tip: hold the pointer over dotted terms anywhere on this site —
            like <Term k="chokepoint" /> or <Term k="sprawl" /> — for a quick
            definition. Press{" "}
            <kbd className="rounded border border-slate-600 bg-slate-900 px-1 font-mono text-[9.5px] text-slate-300">
              ?
            </kbd>{" "}
            for the full guide.
          </p>
        </div>
      )}
    </div>
  );
}
