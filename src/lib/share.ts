/**
 * Share codes — a compact, copy-pasteable encoding of everything that makes
 * up one progress slot: researched techs, applied empire, research rates,
 * milestones, goal and preset. Lets people switch devices or compare with
 * friends without any server.
 */

import type { SlotSnapshot } from "./slots";

const MAGIC = "STT1:";

/* unicode-safe base64 (UTF-8 in, base64 out, chunked to dodge call-stack limits) */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShareCode(snap: SlotSnapshot): string {
  const json = JSON.stringify(snap);
  return MAGIC + utf8ToBase64(json).replace(/=+$/, "");
}

/**
 * Decode a share code. Returns null when the string is not a valid code
 * (wrong prefix, corrupted base64 or unparsable JSON).
 */
export function decodeShareCode(code: string): SlotSnapshot | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(MAGIC)) return null;
  try {
    const json = base64ToUtf8(trimmed.slice(MAGIC.length));
    const val: unknown = JSON.parse(json);
    if (!val || typeof val !== "object") return null;
    const snap = val as SlotSnapshot;
    if (!Array.isArray(snap.acquired)) return null;
    return {
      v: 1,
      name: typeof snap.name === "string" ? snap.name : "Shared progress",
      acquired: snap.acquired.filter((k): k is string => typeof k === "string"),
      empire: snap.empire ?? null,
      rates: {
        physics: numOrNull(snap.rates?.physics),
        society: numOrNull(snap.rates?.society),
        engineering: numOrNull(snap.rates?.engineering),
      },
      milestonesDone: Array.isArray(snap.milestonesDone)
        ? snap.milestonesDone.filter((k): k is string => typeof k === "string")
        : [],
      goal: typeof snap.goal === "string" ? snap.goal : null,
      preset: typeof snap.preset === "string" ? snap.preset : null,
    };
  } catch {
    return null;
  }
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
