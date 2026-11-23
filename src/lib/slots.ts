/**
 * Named save slots.
 *
 * Design: the LIVE state always lives in the existing localStorage keys
 * (progress, my-empire, rates, milestones, goal, preset) and always belongs
 * to the ACTIVE slot. When the user switches slots, the current live state
 * is frozen into a per-slot snapshot (`stellaris.slot.<id>.snap`), and the
 * target slot's snapshot (if any) is restored through the normal setters.
 * This keeps every existing store untouched — slots are layered on top.
 */

export interface SlotMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface SlotRegistry {
  v: 1;
  activeId: string;
  slots: SlotMeta[];
}

/** everything that makes up one slot's progress */
export interface SlotSnapshot {
  v: 1;
  name: string;
  /** researched tech keys */
  acquired: string[];
  /** applied My Empire config (unknown = opaque MyEmpireConfig JSON) */
  empire: unknown;
  /** research output per area */
  rates: {
    physics: number | null;
    society: number | null;
    engineering: number | null;
  };
  /** checked milestone ids */
  milestonesDone: string[];
  /** path-planner goal tech key */
  goal: string | null;
  /** active playstyle preset id */
  preset: string | null;
}

export const SLOT_REGISTRY_KEY = "stellaris.slots-v1";
const snapshotKey = (id: string) => `stellaris.slot.${id}.snap`;

export const DEFAULT_SLOT_REGISTRY: SlotRegistry = {
  v: 1,
  activeId: "main",
  slots: [{ id: "main", name: "Main progress", createdAt: 0 }],
};

export function parseSlotRegistry(raw: string): SlotRegistry {
  try {
    const val: unknown = JSON.parse(raw);
    if (
      val &&
      typeof val === "object" &&
      Array.isArray((val as SlotRegistry).slots) &&
      (val as SlotRegistry).slots.length > 0 &&
      typeof (val as SlotRegistry).activeId === "string" &&
      (val as SlotRegistry).slots.some((s) => s.id === (val as SlotRegistry).activeId)
    ) {
      return val as SlotRegistry;
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_SLOT_REGISTRY;
}

export function serializeSlotRegistry(reg: SlotRegistry): string {
  return JSON.stringify(reg);
}

export function makeSlotId(): string {
  return `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function writeSnapshot(id: string, snap: SlotSnapshot): void {
  try {
    localStorage.setItem(snapshotKey(id), JSON.stringify(snap));
  } catch {
    /* storage unavailable — switch still works in memory */
  }
}

export function readSnapshot(id: string): SlotSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(id));
    if (!raw) return null;
    const val: unknown = JSON.parse(raw);
    if (!val || typeof val !== "object") return null;
    return val as SlotSnapshot;
  } catch {
    return null;
  }
}

export function deleteSnapshot(id: string): void {
  try {
    localStorage.removeItem(snapshotKey(id));
  } catch {
    /* ignore */
  }
}

/** unique non-colliding slot name ("MP campaign", "MP campaign 2", …) */
export function freshSlotName(base: string, existing: string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    if (!taken.has(`${base} ${i}`)) return `${base} ${i}`;
  }
  return `${base} ${Date.now().toString(36)}`;
}
