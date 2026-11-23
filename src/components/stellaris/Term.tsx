"use client";

import type { ReactNode } from "react";
import { GLOSSARY } from "@/lib/glossary";

/**
 * Inline glossary term — dotted underline, hover (or keyboard focus) shows
 * the definition. Falls back to plain text when the key is unknown.
 */
export function Term({
  k,
  children,
}: {
  k: string;
  children?: ReactNode;
}) {
  const entry = GLOSSARY[k];
  if (!entry) return <>{children ?? k}</>;
  return (
    <span
      tabIndex={0}
      className="group relative inline-block cursor-help border-b border-dotted border-slate-400/70 text-slate-200 outline-none"
    >
      {children ?? entry.term}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-slate-600 bg-[#0b1120] p-2.5 text-left text-[11px] font-normal leading-snug text-slate-300 shadow-2xl shadow-black/60 group-hover:block group-focus-within:block"
      >
        <span className="mb-0.5 block font-semibold text-cyan-300">
          {entry.term}
        </span>
        {entry.def}
      </span>
    </span>
  );
}
