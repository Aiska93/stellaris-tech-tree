"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Search, X } from "lucide-react";

/**
 * In-tab search for "My Empire" and "Empire Creator".
 *
 * Behavior: typing a query highlights every *box* (interactive pill, select,
 * marked panel or card) whose text, tooltip or aria-label contains the word —
 * nothing is ever hidden or filtered away. Non-matching boxes stay exactly
 * as they were; matched boxes get a golden glow ring (globals.css).
 */

/** DOM classes used to mark matched boxes — styled in globals.css */
export const SEARCH_HIT_CLASS = "search-hit";
export const SEARCH_HIT_FIRST_CLASS = "search-hit-first";

/**
 * Elements that count as a searchable "box": every interactive pill (ethics,
 * civics, traits, traditions, perks, DLC toggles, playstyles, …), selects
 * (matching their option labels), and containers explicitly marked with
 * `data-search-box` (panels, summary boxes, empire cards use role="button").
 */
const BOX_SELECTOR =
  "button, [role='button'], [role='switch'], select, [data-search-box]";

/** all boxes whose own text / tooltip / aria-label contains the query */
function findHits(root: HTMLElement, q: string): HTMLElement[] {
  const hits: HTMLElement[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(BOX_SELECTOR)) {
    // the search bar's own controls are not searchable content
    if (el.closest("[data-tab-search]")) continue;
    const text = [
      el.textContent ?? "",
      el.getAttribute("title") ?? "",
      el.getAttribute("aria-label") ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (text.includes(q)) hits.push(el);
  }
  // a matching chip also makes every panel around it match — keep only the
  // innermost boxes so the glow lands on the thing the user meant
  return hits.filter((h) => !hits.some((o) => o !== h && h.contains(o)));
}

/**
 * Search state + DOM highlighting for one tab. The scan deliberately runs
 * after *every* render (no dep list): interacting with the tab re-renders
 * nodes and would otherwise wipe the highlight classes. setHits bails out
 * on unchanged counts so the extra renders converge immediately.
 */
export function useTabSearch(rootRef: RefObject<HTMLElement | null>) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll(`.${SEARCH_HIT_CLASS}`).forEach((el) => {
      el.classList.remove(SEARCH_HIT_CLASS, SEARCH_HIT_FIRST_CLASS);
    });
    const q = query.trim().toLowerCase();
    const found = q ? findHits(root, q) : [];
    found.forEach((el, i) => {
      el.classList.add(SEARCH_HIT_CLASS);
      if (i === 0) el.classList.add(SEARCH_HIT_FIRST_CLASS);
    });
    setHits((prev) => (prev === found.length ? prev : found.length));
  });

  return { query, setQuery, hits };
}

interface TabSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  /** number of highlighted boxes for the current query */
  hits: number;
  /** gold for My Empire, rose for Empire Creator */
  accent: "amber" | "rose";
  /** the tab root — used to scroll to the first hit on Enter */
  rootRef: RefObject<HTMLElement | null>;
  placeholder?: string;
}

export function TabSearchBar({
  query,
  onQueryChange,
  hits,
  accent,
  rootRef,
  placeholder = "Search this tab…",
}: TabSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const amber = accent === "amber";
  const active = query.trim() !== "";

  return (
    <div
      data-tab-search
      title={
        "Find boxes by name, effect or tooltip — matches glow gold, nothing gets hidden.\n" +
        "Enter jumps to the first match, Esc clears."
      }
      className="relative flex items-center"
    >
      <Search
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-500"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const first = rootRef.current?.querySelector<HTMLElement>(
              `.${SEARCH_HIT_FIRST_CLASS}`,
            );
            first?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (e.key === "Escape" && query !== "") {
            onQueryChange("");
          }
        }}
        placeholder={placeholder}
        aria-label="Search this tab"
        className={[
          "h-8 w-44 rounded-md border bg-slate-900/70 pl-8 text-[11.5px] font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none sm:w-56",
          active ? "pr-[4.6rem]" : "pr-2.5",
          active
            ? amber
              ? "border-amber-400/50"
              : "border-rose-400/50"
            : "border-slate-700",
          amber ? "focus:border-amber-400/80" : "focus:border-rose-400/80",
        ].join(" ")}
      />
      {active && (
        <>
          <span
            className={[
              "pointer-events-none absolute right-7 text-[10px] font-bold tabular-nums",
              hits === 0 ? "text-rose-300" : amber ? "text-amber-300" : "text-rose-200",
            ].join(" ")}
          >
            {hits} {hits === 1 ? "hit" : "hits"}
          </span>
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            title="Clear search (Esc)"
            aria-label="Clear search"
            className="absolute right-1.5 rounded p-0.5 text-slate-500 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
