/**
 * Monthly research output per area — entered by the user in the My Empire
 * tab, used for research-time estimates ("16,000 pts ≈ 10 months at 40/mo").
 */

import type { Area } from "./techtree";

export interface ResearchRates {
  physics: number | null;
  society: number | null;
  engineering: number | null;
}

export const DEFAULT_RATES: ResearchRates = {
  physics: null,
  society: null,
  engineering: null,
};

export const RATES_AREAS: Area[] = ["physics", "society", "engineering"];

const clampRate = (v: number): number | null =>
  Number.isFinite(v) && v > 0 ? Math.min(99999, Math.round(v)) : null;

export function parseRates(raw: string): ResearchRates {
  try {
    const val: unknown = JSON.parse(raw);
    if (val && typeof val === "object") {
      const r = val as Partial<Record<Area, unknown>>;
      return {
        physics: clampRate(Number(r.physics)),
        society: clampRate(Number(r.society)),
        engineering: clampRate(Number(r.engineering)),
      };
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_RATES;
}

export function serializeRates(rates: ResearchRates): string {
  return JSON.stringify(rates);
}

/** parse a rate input field: empty/invalid → null, else clamped number */
export function rateFromInput(text: string): number | null {
  if (text.trim() === "") return null;
  return clampRate(Number(text));
}
