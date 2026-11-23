"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Atom,
  Castle,
  ChevronDown,
  CircleHelp,
  Cog,
  Copy,
  Crown,
  Dna,
  EyeOff,
  FolderOpen,
  Layers,
  Orbit,
  Percent,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  SearchX,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Download,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AreaSection } from "@/components/stellaris/AreaSection";
import { DlcFilter } from "@/components/stellaris/DlcFilter";
import { EmpireCreator } from "@/components/stellaris/EmpireCreator";
import { HelpModal } from "@/components/stellaris/HelpModal";
import { MilestonePanel } from "@/components/stellaris/MilestonePanel";
import { MyEmpireTab } from "@/components/stellaris/MyEmpireTab";
import { PresetBar, type NextUpSuggestion } from "@/components/stellaris/PresetBar";
import { SaveDialog } from "@/components/stellaris/SaveDialog";
import { ShareDialog } from "@/components/stellaris/ShareDialog";
import { ShipsTab } from "@/components/stellaris/ShipsTab";
import { TechTooltip } from "@/components/stellaris/TechTooltip";
import { useStoredSet, useStoredValue } from "@/lib/useStoredSet";
import type { GeneratedEmpire } from "@/lib/empireGen";
import {
  applyMyEmpire,
  computeEmpireLocks,
  computeOdds,
  configFromEmpire,
  factsFromConfig,
  permanentStartKeys,
  startTechNote,
  tierGateDependents,
  tierGateInfo,
  TIER_UNLOCK_COUNT,
  useMyEmpireStore,
  type MyEmpireConfig,
} from "@/lib/myEmpire";
import {
  ALL_DLC_FILTER_IDS,
  AREA_META,
  BASE_DLC_ID,
  CATEGORY_ORDER,
  DLC_BY_ID,
  DLC_FILTER_LIST,
  EMPTY_SET,
  GAME_VERSION,
  STORAGE_KEYS,
  TAB_META,
  TECHS,
  TECH_BY_KEY,
  TOOL_TABS,
  buildSaveFile,
  isValidDlcId,
  isValidTechKey,
  parseSaveFile,
  CONDITIONAL_START_TECH_KEYS,
  UNIVERSAL_START_TECH_KEYS,
  type Area,
  type TabId,
  type Tech,
} from "@/lib/techtree";
import { PRESET_BY_ID, presetRatingsMap } from "@/lib/presets";
import { MILESTONES } from "@/lib/milestones";
import {
  DEFAULT_RATES,
  parseRates,
  serializeRates,
  type ResearchRates,
} from "@/lib/rates";
import {
  DEFAULT_SLOT_REGISTRY,
  SLOT_REGISTRY_KEY,
  deleteSnapshot,
  freshSlotName,
  makeSlotId,
  parseSlotRegistry,
  readSnapshot,
  serializeSlotRegistry,
  writeSnapshot,
  type SlotSnapshot,
} from "@/lib/slots";
import { decodeShareCode, encodeShareCode } from "@/lib/share";
import { BASE_PATH } from "@/lib/assetPath";

/* persisted UI setting parsers (stable references for useStoredValue) */
const parseZoom = (raw: string): number => {
  const z = Number(raw);
  return Number.isFinite(z) && z >= 0.4 && z <= 1.5 ? z : 1;
};
const zoomStr = (z: number): string => String(z);
const parseFlag = (raw: string): boolean => raw === "1";
const flagStr = (b: boolean): string => (b ? "1" : "0");

/* playstyle preset / goal / milestone persistence (stable refs) */
const parsePresetId = (raw: string): string | null =>
  raw !== "" && PRESET_BY_ID.has(raw) ? raw : null;
const serNullable = (v: string | null): string => v ?? "";
const parseGoalKey = (raw: string): string | null =>
  raw !== "" && TECH_BY_KEY.has(raw) ? raw : null;
const MILESTONE_IDS: ReadonlySet<string> = new Set(
  MILESTONES.map((m) => m.id),
);
const isMilestoneId = (x: string): boolean => MILESTONE_IDS.has(x);

const TAB_ICONS: Record<TabId, LucideIcon> = {
  all: Layers,
  physics: Atom,
  society: Dna,
  engineering: Cog,
  events: Sparkles,
  ships: Anchor,
  myempire: Castle,
  empire: Crown,
};

/** one rendered area block on the tree (a real area, or the events pseudo-area) */
interface SectionDef {
  id: string;
  title: string;
  accent: string;
  techs: Tech[];
  countTechs: Tech[];
  cats: string[];
}

export default function Home() {
  const [tab, setTab] = useState<TabId>("all");
  const [acquired, setAcquiredSet] = useStoredSet(
    STORAGE_KEYS.progress,
    EMPTY_SET,
    isValidTechKey,
  );
  const [activeDlcs, setActiveDlcsSet] = useStoredSet(
    STORAGE_KEYS.dlcFilter,
    ALL_DLC_FILTER_IDS,
    isValidDlcId,
  );
  const [search, setSearch] = useState("");
  const [hideAcquired, setHideAcquired] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  /** tech tree zoom (0.4–1.5), persisted */
  const [zoom, setZoom] = useStoredValue(
    "stellaris-zoom-v1",
    1,
    parseZoom,
    zoomStr,
  );
  /** show research-appearance odds on the cards, persisted */
  const [showOdds, setShowOdds] = useStoredValue(
    "stellaris-show-odds-v1",
    true,
    parseFlag,
    flagStr,
  );
  /** active playstyle preset (null = none), persisted */
  const [presetId, setPresetId] = useStoredValue(
    "stellaris-preset-v1",
    null,
    parsePresetId,
    serNullable,
  );
  /** path-planner goal tech key, persisted */
  const [goalKey, setGoalKey] = useStoredValue(
    "stellaris-goal-v1",
    null,
    parseGoalKey,
    serNullable,
  );
  /** monthly research output per area (time estimates), persisted */
  const [rates, setRates] = useStoredValue(
    "stellaris-rates-v1",
    DEFAULT_RATES,
    parseRates,
    serializeRates,
  );
  /** checked-off early-game milestones, persisted */
  const [milestonesDone, setMilestonesSet] = useStoredSet(
    "stellaris-milestones-v1",
    EMPTY_SET,
    isMilestoneId,
  );
  /** named save-slot registry, persisted (live state = active slot) */
  const [slotRegistry, setSlotRegistry] = useStoredValue(
    SLOT_REGISTRY_KEY,
    DEFAULT_SLOT_REGISTRY,
    parseSlotRegistry,
    serializeSlotRegistry,
  );
  /** undo/redo history of the acquired set (in memory only) */
  const [undoPast, setUndoPast] = useState<ReadonlySet<string>[]>([]);
  const [redoFuture, setRedoFuture] = useState<ReadonlySet<string>[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<number | null>(null);
  /** modal / popover UI state */
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [newSlotName, setNewSlotName] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  /** zoom in/out by a 15% step (zoom buttons next to the slider) */
  const stepZoom = useCallback(
    (delta: number) => {
      setZoom(
        Math.min(1.5, Math.max(0.4, Math.round((zoom + delta) * 100) / 100)),
      );
    },
    [zoom, setZoom],
  );
  /** text being typed into the zoom % box (null = not editing) */
  const [zoomDraft, setZoomDraft] = useState<string | null>(null);
  /** set when Esc cancels the edit — lets onBlur skip the commit, because
      the blur handler can fire before the setZoomDraft(null) re-render and
      would otherwise see the stale draft through its closure */
  const zoomCancelledRef = useRef(false);
  /** apply the typed zoom percentage (digits only, clamped to 40–150) */
  const commitZoomDraft = useCallback(() => {
    if (zoomCancelledRef.current) {
      zoomCancelledRef.current = false;
      setZoomDraft(null);
      return;
    }
    if (zoomDraft === null) return;
    const pct = parseInt(zoomDraft.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(pct)) {
      setZoom(Math.min(1.5, Math.max(0.4, Math.round(pct) / 100)));
    }
    setZoomDraft(null);
  }, [zoomDraft, setZoom]);
  /** empire applied to the tree via the "My Empire" tab */
  const [myEmpire, setMyEmpire] = useMyEmpireStore();
  /** tech key whose unlocks we are tracing after selection */
  const [spotlight, setSpotlight] = useState<string | null>(null);
  /** tech key briefly flashed after a prerequisite redirect */
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const [hover, setHover] = useState<{ tech: Tech; rect: DOMRect } | null>(
    null,
  );
  /** tech key whose connector lines are highlighted while hovered */
  const [hoverTraceKey, setHoverTraceKey] = useState<string | null>(null);
  const hoverTraceTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- "My Empire": locks + research odds ---- */
  const empireFacts = useMemo(
    () => (myEmpire ? factsFromConfig(myEmpire) : null),
    [myEmpire],
  );
  const empireLocks = useMemo(
    () => computeEmpireLocks(empireFacts),
    [empireFacts],
  );
  const oddsMap = useMemo(
    () => computeOdds(acquired, activeDlcs, empireFacts, empireLocks),
    [acquired, activeDlcs, empireFacts, empireLocks],
  );

  /*
   * Starting technologies (Bio-Reactor, Hydroponics Farming, …) are known by
   * every empire from day one: they are force-added to the acquired set on
   * every load and can never be un-researched. Empire-conditional starting
   * techs (Weavers, Synaptic Structures, …) are only permanent while the
   * matching setting is applied in the "My Empire" tab — otherwise they are
   * normal researchable techs.
   */
  const permanentKeys = useMemo(
    () => permanentStartKeys(empireFacts),
    [empireFacts],
  );
  const prevPermanentRef = useRef<ReadonlySet<string>>(permanentKeys);

  useEffect(() => {
    /*
     * Read the persisted progress straight from localStorage: during SSR
     * hydration `acquired` can still be the empty server snapshot, and
     * writing from that would wipe the stored research progress.
     */
    const persisted = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.progress);
        const arr: unknown = raw == null ? [] : JSON.parse(raw);
        return Array.isArray(arr)
          ? new Set(arr.filter((x): x is string => typeof x === "string"))
          : new Set<string>(acquired);
      } catch {
        return new Set<string>(acquired);
      }
    })();

    /* add everything this empire starts with */
    const missing = [...permanentKeys].filter((k) => !persisted.has(k));

    /*
     * Remove starting techs that the previous empire granted but the new one
     * does not (empire changed / cleared), plus a one-time cleanup of the
     * conditional techs force-added by the old all-empire behaviour. A tech
     * is only removed when nothing researched depends on it — same rule as
     * manually unchecking.
     */
    let lostGrants = [...prevPermanentRef.current].filter(
      (k) => !permanentKeys.has(k),
    );
    prevPermanentRef.current = permanentKeys;

    let migrated = false;
    try {
      migrated = localStorage.getItem("stellaris-start-fix-v1") === "1";
      if (!migrated) localStorage.setItem("stellaris-start-fix-v1", "1");
    } catch {
      migrated = true; // storage unavailable — don't attempt the migration
    }
    if (!migrated) lostGrants = [...CONDITIONAL_START_TECH_KEYS];

    const removable = (k: string) =>
      !TECHS.some((t) => persisted.has(t.key) && t.prereqs.includes(k));
    const stale = [...new Set(lostGrants)].filter(
      (k) => persisted.has(k) && !permanentKeys.has(k) && removable(k),
    );

    if (missing.length === 0 && stale.length === 0) return;
    const next = new Set(persisted);
    for (const k of missing) next.add(k);
    for (const k of stale) next.delete(k);
    setAcquiredSet(next);

    if (stale.length > 0) {
      toast.info(
        stale.length === 1
          ? `${TECH_BY_KEY.get(stale[0])?.name ?? stale[0]} is no longer a starting technology of your empire`
          : `${stale.length} techs are no longer starting technologies of your empire`,
        {
          description:
            "Empire-specific starting techs are only permanently researched while the matching setting is chosen in the My Empire tab — you can research them normally.",
        },
      );
    }
  }, [acquired, permanentKeys, setAcquiredSet]);

  /* send the selected Empire Creator empire to the My Empire tab */
  const handleSendToMyEmpire = useCallback((empire: GeneratedEmpire) => {
    const cfg = configFromEmpire(empire);
    const locks = computeEmpireLocks(factsFromConfig(cfg));
    applyMyEmpire(cfg);
    setTab("myempire");
    toast.success(`${empire.name} is now your empire`, {
      description: `${locks.size} ${locks.size === 1 ? "technology is" : "technologies are"} locked for this empire — research odds updated.`,
    });
  }, []);

  /* ---------- undo / redo / reset (researched-set history) ---------- */

  /** apply a new acquired set AND push the previous one onto the undo stack */
  const commitAcquired = useCallback(
    (next: Set<string>) => {
      setUndoPast((p) => [...p.slice(-49), acquired]);
      setRedoFuture([]);
      setAcquiredSet(next);
    },
    [acquired, setAcquiredSet],
  );

  const undo = useCallback(() => {
    if (undoPast.length === 0) return;
    const prev = undoPast[undoPast.length - 1];
    setUndoPast((p) => p.slice(0, -1));
    setRedoFuture((f) => [acquired, ...f].slice(0, 50));
    setAcquiredSet(new Set(prev));
    setSpotlight(null);
  }, [undoPast, acquired, setAcquiredSet]);

  const redo = useCallback(() => {
    if (redoFuture.length === 0) return;
    const next = redoFuture[0];
    setRedoFuture((f) => f.slice(1));
    setUndoPast((p) => [...p.slice(-49), acquired]);
    setAcquiredSet(new Set(next));
    setSpotlight(null);
  }, [redoFuture, acquired, setAcquiredSet]);

  /** uncheck every researched tech (undoable — Ctrl+Z restores it) */
  const resetProgress = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    setConfirmReset(false);
    commitAcquired(new Set());
    toast.info("Research progress reset", {
      description: "Nothing is lost — Ctrl+Z or the redo button puts it back.",
    });
  }, [confirmReset, commitAcquired]);

  /* ---------- named save slots ---------- */

  const activeSlot =
    slotRegistry.slots.find((s) => s.id === slotRegistry.activeId) ??
    slotRegistry.slots[0];

  /** freeze the current live state into the given slot's snapshot */
  const snapshotCurrent = useCallback(
    (slotId: string): SlotSnapshot => ({
      v: 1,
      name: activeSlot?.name ?? "Progress",
      acquired: [...acquired],
      empire: myEmpire,
      rates,
      milestonesDone: [...milestonesDone],
      goal: goalKey,
      preset: presetId,
    }),
    [activeSlot, acquired, myEmpire, rates, milestonesDone, goalKey, presetId],
  );

  /** load a snapshot into the live stores (silent — no history entries) */
  const applySnapshot = useCallback(
    (snap: SlotSnapshot) => {
      setAcquiredSet(new Set(snap.acquired));
      setMyEmpire((snap.empire as MyEmpireConfig | null) ?? null);
      setRates({
        physics: snap.rates?.physics ?? null,
        society: snap.rates?.society ?? null,
        engineering: snap.rates?.engineering ?? null,
      });
      setMilestonesSet(new Set(snap.milestonesDone ?? []));
      setGoalKey(snap.goal && TECH_BY_KEY.has(snap.goal) ? snap.goal : null);
      setPresetId(snap.preset && PRESET_BY_ID.has(snap.preset) ? snap.preset : null);
      setSpotlight(null);
      setHover(null);
      setHoverTraceKey(null);
    },
    [
      setAcquiredSet,
      setMyEmpire,
      setRates,
      setMilestonesSet,
      setGoalKey,
      setPresetId,
    ],
  );

  const switchSlot = useCallback(
    (id: string) => {
      if (id === slotRegistry.activeId) return;
      const target = slotRegistry.slots.find((s) => s.id === id);
      if (!target) return;
      writeSnapshot(slotRegistry.activeId, snapshotCurrent(slotRegistry.activeId));
      const snap = readSnapshot(id);
      if (snap) applySnapshot(snap);
      else {
        applySnapshot({
          v: 1,
          name: target.name,
          acquired: [],
          empire: null,
          rates: DEFAULT_RATES,
          milestonesDone: [],
          goal: null,
          preset: null,
        });
      }
      setSlotRegistry({ ...slotRegistry, activeId: id });
      setUndoPast([]);
      setRedoFuture([]);
      toast.success(`Switched to “${target.name}”`);
    },
    [slotRegistry, snapshotCurrent, applySnapshot, setSlotRegistry],
  );

  const createSlot = useCallback(
    (name: string) => {
      const id = makeSlotId();
      const finalName = freshSlotName(
        name,
        slotRegistry.slots.map((s) => s.name),
      );
      writeSnapshot(slotRegistry.activeId, snapshotCurrent(slotRegistry.activeId));
      applySnapshot({
        v: 1,
        name: finalName,
        acquired: [],
        empire: null,
        rates: DEFAULT_RATES,
        milestonesDone: [],
        goal: null,
        preset: null,
      });
      setSlotRegistry({
        ...slotRegistry,
        activeId: id,
        slots: [
          ...slotRegistry.slots,
          { id, name: finalName, createdAt: Date.now() },
        ],
      });
      setUndoPast([]);
      setRedoFuture([]);
      toast.success(`New slot “${finalName}” created`, {
        description:
          "Started from a clean slate — the previous slot keeps its own progress.",
      });
    },
    [slotRegistry, snapshotCurrent, applySnapshot, setSlotRegistry],
  );

  const duplicateSlot = useCallback(
    (id: string) => {
      const src = slotRegistry.slots.find((s) => s.id === id);
      if (!src) return;
      const name = freshSlotName(
        `${src.name} copy`,
        slotRegistry.slots.map((s) => s.name),
      );
      const newId = makeSlotId();
      if (id === slotRegistry.activeId) {
        // duplicating the live slot: snapshot the current state as the copy
        writeSnapshot(newId, { ...snapshotCurrent(id), name });
      } else {
        const snap = readSnapshot(id);
        if (!snap) {
          toast.error("That slot is empty — nothing to copy");
          return;
        }
        writeSnapshot(newId, { ...snap, name });
      }
      setSlotRegistry({
        ...slotRegistry,
        slots: [
          ...slotRegistry.slots,
          { id: newId, name, createdAt: Date.now() },
        ],
      });
      toast.success(`Copied to “${name}”`);
    },
    [slotRegistry, snapshotCurrent, setSlotRegistry],
  );

  const deleteSlot = useCallback(
    (id: string) => {
      if (slotRegistry.slots.length <= 1) return;
      const victim = slotRegistry.slots.find((s) => s.id === id);
      if (!victim) return;
      let reg = {
        ...slotRegistry,
        slots: slotRegistry.slots.filter((s) => s.id !== id),
      };
      if (id === slotRegistry.activeId) {
        const next = reg.slots[0];
        const snap = readSnapshot(next.id);
        if (snap) applySnapshot(snap);
        else {
          applySnapshot({
            v: 1,
            name: next.name,
            acquired: [],
            empire: null,
            rates: DEFAULT_RATES,
            milestonesDone: [],
            goal: null,
            preset: null,
          });
        }
        reg = { ...reg, activeId: next.id };
        setUndoPast([]);
        setRedoFuture([]);
      }
      deleteSnapshot(id);
      setSlotRegistry(reg);
      toast.info(`Deleted “${victim.name}”`);
    },
    [slotRegistry, applySnapshot, setSlotRegistry],
  );

  const renameSlot = useCallback(
    (id: string, name: string) => {
      const final = name.trim();
      if (final === "") return;
      setSlotRegistry({
        ...slotRegistry,
        slots: slotRegistry.slots.map((s) =>
          s.id === id ? { ...s, name: final } : s,
        ),
      });
    },
    [slotRegistry, setSlotRegistry],
  );

  /* ---------- share codes ---------- */

  const getCode = useCallback(
    () => encodeShareCode(snapshotCurrent(slotRegistry.activeId)),
    [snapshotCurrent, slotRegistry.activeId],
  );

  /** returns an error message, or null on success */
  const importCode = useCallback(
    (code: string): string | null => {
      const snap = decodeShareCode(code);
      if (!snap) {
        return "That is not a valid share code — it should start with “STT1:”.";
      }
      applySnapshot(snap);
      setUndoPast([]);
      setRedoFuture([]);
      return null;
    },
    [applySnapshot],
  );

  /* ---------- milestones / goal / preset handlers ---------- */

  const toggleMilestone = useCallback(
    (id: string) => {
      const next = new Set(milestonesDone);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setMilestonesSet(next);
    },
    [milestonesDone, setMilestonesSet],
  );

  const handleSetGoal = useCallback(
    (key: string | null) => {
      setGoalKey(key);
      if (key) {
        toast.success(`Path planned to ${TECH_BY_KEY.get(key)?.name ?? key}`, {
          description:
            "Every missing prerequisite now has a dashed amber outline — check them off as you go.",
        });
      } else {
        toast.info("Planned goal cleared");
      }
    },
    [setGoalKey],
  );

  /* ---------- keyboard shortcuts ---------- */

  const focusSearch = useCallback(() => {
    if (tab === "myempire" || tab === "empire") {
      const el = document.querySelector<HTMLInputElement>(
        "[data-tab-search] input",
      );
      if (el) {
        el.focus();
        return;
      }
    }
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el?.closest?.(
        "input, textarea, select, [contenteditable='true']",
      );
      if (e.key === "Escape") {
        if (helpOpen) setHelpOpen(false);
        else if (shareOpen) setShareOpen(false);
        else if (slotsOpen) setSlotsOpen(false);
        else if (typing) (document.activeElement as HTMLElement | null)?.blur?.();
        else if (search !== "") setSearch("");
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (!e.altKey && !typing && (k === "z" || k === "y")) {
          e.preventDefault();
          if (k === "y" || e.shiftKey) redo();
          else undo();
        }
        return;
      }
      if (typing || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (/^[1-8]$/.test(e.key)) {
        const meta = TAB_META[Number(e.key) - 1];
        if (meta && meta.id !== tab) {
          setTab(meta.id);
          setHover(null);
          setHoverTraceKey(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    helpOpen,
    shareOpen,
    slotsOpen,
    search,
    tab,
    undo,
    redo,
    focusSearch,
  ]);

  /* ---------- preset ratings / path planner / next-up ---------- */

  const ratingsMap = useMemo(() => presetRatingsMap(presetId), [presetId]);

  /** missing prerequisites between here and the goal (walks the chain) */
  const plannedKeys = useMemo(() => {
    if (!goalKey) return EMPTY_SET;
    const goal = TECH_BY_KEY.get(goalKey);
    if (!goal) return EMPTY_SET;
    const out = new Set<string>();
    const queue = [...goal.prereqs];
    while (queue.length > 0) {
      const k = queue.shift()!;
      if (out.has(k) || acquired.has(k)) continue;
      const t = TECH_BY_KEY.get(k);
      if (!t) continue;
      out.add(k);
      queue.push(...t.prereqs);
    }
    return out;
  }, [goalKey, acquired]);

  const goalInfo = useMemo(() => {
    if (!goalKey) return null;
    const goal = TECH_BY_KEY.get(goalKey);
    if (!goal) return null;
    const keys = [...plannedKeys];
    if (!acquired.has(goalKey)) keys.push(goalKey);
    let totalCost = 0;
    for (const k of keys) totalCost += TECH_BY_KEY.get(k)?.cost ?? 0;
    return {
      key: goalKey,
      name: goal.name,
      remaining: keys.length,
      totalCost,
    };
  }, [goalKey, plannedKeys, acquired]);

  const activePreset = presetId ? (PRESET_BY_ID.get(presetId) ?? null) : null;

  /** best available picks for the active playstyle (recommender) */
  const nextUp = useMemo<NextUpSuggestion[]>(() => {
    if (!activePreset) return [];
    const rank: Record<string, number> = { S: 0, A: 1, B: 2 };
    const candidates: NextUpSuggestion[] = [];
    for (const [key, rating] of Object.entries(activePreset.ratings)) {
      const tech = TECH_BY_KEY.get(key);
      if (!tech || tech.event || acquired.has(key)) continue;
      if (tech.dlc && !activeDlcs.has(tech.dlc)) continue;
      if (empireLocks.has(key)) continue;
      const rate = rates[tech.area] ?? null;
      candidates.push({
        key,
        name: tech.name,
        area: tech.area,
        cost: tech.cost,
        rating,
        months: rate && tech.cost > 0 ? Math.ceil(tech.cost / rate) : null,
      });
    }
    candidates.sort((a, b) => {
      const drawable = (k: string) => {
        const o = oddsMap.get(k);
        return o && !o.locked && !o.blocked && (o.pct ?? 0) > 0 ? 1 : 0;
      };
      return (
        rank[a.rating] - rank[b.rating] ||
        drawable(b.key) - drawable(a.key) ||
        a.cost - b.cost
      );
    });
    return candidates.slice(0, 3);
  }, [activePreset, acquired, activeDlcs, empireLocks, oddsMap, rates]);

  /*
   * Prerequisite-ordered research tracking: a tech can only be checked when
   * every prerequisite is researched, and a prerequisite cannot be unchecked
   * while researched techs still depend on it. Blocked clicks explain why and
   * redirect the user to the tech they need to handle first.
   */

  /** Bring a tech into view: switches tab, clears search / hide-done when
   *  needed, scrolls the card into view, spotlights it and flashes the card. */
  const redirectToTech = useCallback(
    (key: string) => {
      const tech = TECH_BY_KEY.get(key);
      if (!tech) return;

      // prerequisite behind a disabled DLC — it can never be shown, so point
      // the user at the DLC filter instead
      if (tech.dlc && !activeDlcs.has(tech.dlc)) {
        setFiltersOpen(true);
        toast.warning(
          `${tech.name} requires the ${DLC_BY_ID.get(tech.dlc)?.name ?? tech.dlc} DLC`,
          {
            description:
              "Enable the DLC in the filter to research this technology.",
          },
        );
        return;
      }

      // make sure the target is actually rendered on screen
      if (search.trim() !== "") setSearch("");
      if (hideAcquired && acquired.has(key)) setHideAcquired(false);
      const neededTab: TabId = tech.event ? "events" : tech.area;
      const showsTarget = tab === neededTab || (tab === "all" && !tech.event);
      if (!showsTarget) setTab(neededTab);

      // give React a moment to commit the tab/search changes, then scroll
      window.setTimeout(() => {
        document
          .querySelector(`[data-tech-key="${key}"]`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        setSpotlight(key);
        setFlashKey(key);
      }, 320);

      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => {
        setFlashKey(null);
        flashTimer.current = null;
      }, 3600);
    },
    [activeDlcs, search, hideAcquired, acquired, tab],
  );

  const toggleAcquired = useCallback(
    (key: string) => {
      const tech = TECH_BY_KEY.get(key);
      if (!tech) return;

      /* starting technologies are permanently researched */
      if (permanentKeys.has(key)) {
        toast.info(`${tech.name} is a starting technology`, {
          description: UNIVERSAL_START_TECH_KEYS.has(key)
            ? "Every empire begins the game with it — it stays researched."
            : `Your empire begins the game with it (${startTechNote(key) ?? "empire setting"}) — it stays researched while that setting is applied.`,
        });
        return;
      }

      const wasOn = acquired.has(key);

      /*
       * Locked forever by the empire applied in the "My Empire" tab — blocks
       * researching, but an already-researched tech (legacy progress) can
       * still be un-researched.
       */
      const empireLockReason = !wasOn ? empireLocks.get(key) : undefined;
      if (empireLockReason) {
        toast.warning(`${tech.name} is locked for your empire`, {
          description: empireLockReason,
        });
        return;
      }

      if (wasOn) {
        /* unchecking: blocked while researched techs still depend on this one */
        const dependents = TECHS.filter(
          (t) => acquired.has(t.key) && t.prereqs.includes(key),
        ).sort((a, b) => b.tier - a.tier || b.cost - a.cost);
        if (dependents.length > 0) {
          const names = dependents.map((d) => d.name);
          toast.warning(`Cannot uncheck ${tech.name} yet`, {
            description:
              `${names.length === 1 ? `${names[0]} is` : `${names.join(", ")} are`} ` +
              `researched and still need${names.length === 1 ? "s" : ""} it — ` +
              `uncheck ${names.length === 1 ? "that first" : "those first"}. Taking you there.`,
          });
          redirectToTech(dependents[0].key);
          return;
        }
        /* unchecking: blocked while it would re-lock the next tier
           (tier N+1 needs 6 tier-N techs of the same area researched) */
        const gateDependents = tierGateDependents(acquired, key);
        if (gateDependents.length > 0) {
          const names = gateDependents.map((d) => d.name);
          toast.warning(`Cannot uncheck ${tech.name} yet`, {
            description:
              `${names.length === 1 ? `${names[0]} is` : `${names.join(", ")} are`} ` +
              `researched and tier ${tech.tier + 1} needs ${TIER_UNLOCK_COUNT} tier-${tech.tier} ` +
              `${tech.area} techs — uncheck ${names.length === 1 ? "that first" : "those first"}. Taking you there.`,
          });
          redirectToTech(gateDependents[0].key);
          return;
        }
        const next = new Set(acquired);
        next.delete(key);
        commitAcquired(next);
        setSpotlight(null);
        return;
      }

      /* checking: every prerequisite must be researched first */
      const missing = tech.prereqs
        .filter((p) => !acquired.has(p))
        .map((p) => TECH_BY_KEY.get(p))
        .filter((p): p is Tech => p != null)
        .sort((a, b) => a.tier - b.tier || a.cost - b.cost);
      if (missing.length > 0) {
        toast.warning(`${tech.name} is locked`, {
          description: `Research ${missing
            .map((m) => m.name)
            .join(", ")} first — taking you there.`,
        });
        // send the user to the cheapest prerequisite they can actually see
        const target =
          missing.find((m) => !m.dlc || activeDlcs.has(m.dlc)) ?? missing[0];
        redirectToTech(target.key);
        return;
      }

      /* checking: tier N opens after 6 tier-(N-1) techs of the same area */
      const gate = tierGateInfo(acquired, tech.area, tech.tier);
      if (!gate.unlocked) {
        toast.warning(`${tech.name} is locked`, {
          description:
            `Tier ${tech.tier} opens after ${gate.need} tier-${tech.tier - 1} ` +
            `${tech.area} technologies are researched — ${gate.have}/${gate.need} so far.`,
        });
        return;
      }

      const next = new Set(acquired);
      next.add(key);
      commitAcquired(next);
      // selecting a tech traces what it unlocks next
      setSpotlight(key);
    },
    [acquired, commitAcquired, activeDlcs, redirectToTech, empireLocks, permanentKeys],
  );

  const toggleDlc = useCallback(
    (id: string) => {
      const next = new Set(activeDlcs);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setActiveDlcsSet(next);
    },
    [activeDlcs, setActiveDlcsSet],
  );

  const setAllDlcs = useCallback(
    (on: boolean) => {
      setActiveDlcsSet(on ? ALL_DLC_FILTER_IDS : EMPTY_SET);
    },
    [setActiveDlcsSet],
  );

  /* ---------- filtering ---------- */
  const searchLower = search.trim().toLowerCase();

  const passesFilters = useCallback(
    (t: Tech) => {
      // base game is always active — only real DLCs can be filtered out
      if (t.dlc && !activeDlcs.has(t.dlc)) return false;
      if (searchLower && !t.name.toLowerCase().includes(searchLower))
        return false;
      return true;
    },
    [activeDlcs, searchLower],
  );

  const inTab = useCallback(
    (t: Tech, current: TabId) =>
      t.event
        ? current === "events"
        : current === "all" || t.area === current,
    [],
  );

  const tabCounts = useMemo(() => {
    const m = new Map<TabId, number>();
    for (const t of TECHS) {
      if (!passesFilters(t)) continue;
      if (t.event) {
        // while searching, event techs also show on the All tab
        if (searchLower) m.set("all", (m.get("all") ?? 0) + 1);
        m.set("events", (m.get("events") ?? 0) + 1);
      } else {
        m.set("all", (m.get("all") ?? 0) + 1);
        m.set(t.area, (m.get(t.area) ?? 0) + 1);
      }
    }
    return m;
  }, [passesFilters, searchLower]);

  const dlcStats = useMemo(() => {
    const counts = new Map<string, number>();
    const done = new Map<string, number>();
    for (const t of TECHS) {
      const id = t.dlc ?? BASE_DLC_ID;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (acquired.has(t.key)) done.set(id, (done.get(id) ?? 0) + 1);
    }
    return { counts, done };
  }, [acquired]);

  /**
   * Techs you can acquire after your researched ones: every not-yet-researched
   * tech that has at least one researched direct prerequisite. Shown with a
   * light gold highlight so it stays distinct from the bright tracing and
   * from acquired cards. DLCs that are filtered out do not count.
   */
  const readyKeys = useMemo(() => {
    const s = new Set<string>();
    if (acquired.size === 0) return s;
    for (const t of TECHS) {
      if (acquired.has(t.key)) continue;
      if (t.dlc && !activeDlcs.has(t.dlc)) continue;
      if (empireLocks.has(t.key)) continue;
      for (const p of t.prereqs) {
        if (acquired.has(p)) {
          s.add(t.key);
          break;
        }
      }
    }
    return s;
  }, [acquired, activeDlcs, empireLocks]);

  /**
   * Techs that cannot be selected right now: locked forever by the applied
   * empire, or still missing prerequisites, or behind their tier gate (same
   * rules as the click handler). Mirrors the checks in `toggleAcquired` —
   * these cards get a much stronger gray-out so selectable techs stand out.
   */
  const blockedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of TECHS) {
      if (acquired.has(t.key)) continue;
      if (t.dlc && !activeDlcs.has(t.dlc)) continue;
      if (empireLocks.has(t.key)) {
        s.add(t.key);
        continue;
      }
      if (!t.prereqs.every((p) => acquired.has(p))) {
        s.add(t.key);
        continue;
      }
      if (!tierGateInfo(acquired, t.area, t.tier).unlocked) s.add(t.key);
    }
    return s;
  }, [acquired, activeDlcs, empireLocks]);

  const sections = useMemo(() => {
    if (tab === "empire" || tab === "myempire" || tab === "ships") return [];
    const base = TECHS.filter((t) => inTab(t, tab) && passesFilters(t));
    if (tab === "events") {
      return [
        {
          id: "events",
          title: "Event Technologies",
          accent: "#c084fc",
          techs: base,
          countTechs: base,
          cats: CATEGORY_ORDER.events ?? [],
        },
      ] satisfies SectionDef[];
    }
    const areas: Area[] =
      tab === "all"
        ? ["physics", "society", "engineering"]
        : [tab as Area];
    const result: SectionDef[] = areas
      .map((a) => ({
        id: a,
        title: `${AREA_META[a].label} Technologies`,
        accent: AREA_META[a].color,
        techs: base.filter((t) => t.area === a),
        countTechs: base.filter((t) => t.area === a),
        cats: CATEGORY_ORDER[a] ?? [],
      }))
      .filter((s) => s.countTechs.length > 0);
    // while searching on the All tab, also surface matching event techs
    if (tab === "all" && searchLower) {
      const evs = TECHS.filter((t) => t.event && passesFilters(t));
      if (evs.length > 0) {
        result.push({
          id: "events",
          title: "Event Technologies",
          accent: "#c084fc",
          techs: evs,
          countTechs: evs,
          cats: CATEGORY_ORDER.events ?? [],
        });
      }
    }
    return result;
  }, [tab, passesFilters, inTab, searchLower]);

  /* ---------- interactions ---------- */
  const onHover = useCallback((tech: Tech | null, el: HTMLElement | null) => {
    if (hoverTraceTimer.current != null) {
      window.clearTimeout(hoverTraceTimer.current);
      hoverTraceTimer.current = null;
    }
    if (!tech || !el) {
      setHover(null);
      setHoverTraceKey(null);
      return;
    }
    setHover({ tech, rect: el.getBoundingClientRect() });
    setHoverTraceKey(tech.key);
    // connector lines fade out after 5s even if the pointer stays on the card
    hoverTraceTimer.current = window.setTimeout(() => {
      setHoverTraceKey(null);
      hoverTraceTimer.current = null;
    }, 5000);
  }, []);

  // stop the pending auto-hide timer when the page unmounts
  useEffect(
    () => () => {
      if (hoverTraceTimer.current != null)
        window.clearTimeout(hoverTraceTimer.current);
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  // clicking empty UI space dismisses connector highlights and tracing
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        el.closest(
          "button, a, input, select, textarea, label, header, footer, [data-tech-key], [role='dialog']",
        )
      ) {
        return;
      }
      setSpotlight(null);
      setHoverTraceKey(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleSave = useCallback(
    (fileName: string) => {
      const data = buildSaveFile(fileName, acquired);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Progress saved to ${fileName}.json (${data.acquired.length} techs)`,
      );
    },
    [acquired],
  );

  const handleLoadFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const { acquired: keys, name } = parseSaveFile(text);
        // starting techs of the applied empire are always known — merge them in
        const merged = new Set([...keys, ...permanentKeys]);
        setAcquiredSet(merged);
        toast.success(
          `Loaded ${merged.size} researched ${merged.size === 1 ? "technology" : "technologies"}${name ? ` from “${name}”` : ""}`,
        );
      } catch (e) {
        toast.error("Could not import that file", {
          description:
            e instanceof Error ? e.message : "The file is not a valid save.",
        });
      }
    },
    [setAcquiredSet, permanentKeys],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setAllDlcs(true);
    setTab("all");
    setHideAcquired(false);
  }, [setAllDlcs]);

  const activeDlcCount = useMemo(
    () => DLC_FILTER_LIST.filter((d) => activeDlcs.has(d.id)).length,
    [activeDlcs],
  );

  const isFiltering =
    search.trim() !== "" || activeDlcCount < DLC_FILTER_LIST.length;

  /** one tab pill — shared by the tech-tree tab row and the tool-tab group */
  const renderTab = (m: (typeof TAB_META)[number]) => {
    const active = tab === m.id;
    const count = tabCounts.get(m.id);
    const Icon = TAB_ICONS[m.id];
    // the tool tabs (gold My Empire, red Empire Creator, blue Ships) are
    // styled as separate tools rather than tech-tree area tabs
    const isTool = TOOL_TABS.has(m.id);
    const isGold = m.id === "myempire";
    const isBlue = m.id === "ships";
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => {
          setTab(m.id);
          // card unmounts without mouseleave — drop tooltip & traces
          setHover(null);
          setHoverTraceKey(null);
        }}
        aria-pressed={active}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
          active
            ? isTool
              ? isGold
                ? "text-amber-100"
                : isBlue
                  ? "text-blue-100"
                  : "text-rose-200"
              : "text-white"
            : isTool
              ? isGold
                ? "border-amber-300/35 bg-amber-400/[0.08] text-amber-300/80 hover:border-amber-300/70 hover:bg-amber-400/15 hover:text-amber-100"
                : isBlue
                  ? "border-blue-400/35 bg-blue-400/[0.08] text-blue-300/80 hover:border-blue-400/70 hover:bg-blue-400/15 hover:text-blue-100"
                  : "border-rose-400/30 bg-rose-400/[0.07] text-rose-300/75 hover:border-rose-400/60 hover:bg-rose-400/15 hover:text-rose-200"
              : "border-slate-800 bg-transparent text-slate-300 hover:border-slate-600 hover:text-white",
        ].join(" ")}
        style={
          active
            ? isTool
              ? isGold
                ? { borderColor: "#fbbf2480", background: "#fbbf2424", color: "#fde68a" }
                : isBlue
                  ? { borderColor: "#3b82f680", background: "#1d4ed826", color: "#bfdbfe" }
                  : { borderColor: "#fb718580", background: "#fb718524", color: "#fda4af" }
              : {
                  borderColor: `${m.color}88`,
                  background: `${m.color}1c`,
                  color: m.color,
                }
            : undefined
        }
      >
        <Icon className="h-3.5 w-3.5" />
        {m.label}
        {count != null && (
          <span className="text-[10px] font-semibold opacity-75">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="stellaris-bg relative flex min-h-screen flex-col text-slate-200">
      {/* one star-pattern layer per tab — the active pattern crossfades in.
          background-image is set inline (not in globals.css) so it honors the
          deploy basePath when hosted under /stellaris-tech-tree/ */}
      {TAB_META.map((m) => (
        <div
          key={m.id}
          aria-hidden
          className={`stars stars-${m.id}${tab === m.id ? " stars-on" : ""}`}
          style={{
            backgroundImage: `url(${BASE_PATH}/patterns/stars-${m.id}.svg)`,
          }}
        />
      ))}

      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-[#05070e]/88 backdrop-blur-md">
        <div className="w-full px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-300/20 to-cyan-400/10">
                <Orbit className="h-5 w-5 text-amber-300" />
              </span>
              <div className="leading-tight">
                <p
                  className="text-[15px] font-bold tracking-[0.22em] text-slate-50"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  STELLARIS
                </p>
                <p className="text-[9.5px] font-medium tracking-[0.34em] text-cyan-300/80">
                  TECH TREE
                </p>
              </div>
            </div>

            <span className="hidden rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-0.5 text-[10.5px] font-medium text-slate-300 sm:inline-block">
              v{GAME_VERSION} · Cetus
            </span>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">
              {acquired.size}/{TECHS.length} researched
            </span>
            {readyKeys.size > 0 && (
              <span
                title="Techs unlocked by your researched techs — shown with a light gold outline"
                className="hidden items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-200/90 sm:inline-flex"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-amber-300/80"
                />
                {readyKeys.size} ready to research
              </span>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search techs…"
                  aria-label="Search technologies by name"
                  className="h-9 w-40 border-slate-700 bg-slate-900/70 pl-8 text-slate-100 placeholder:text-slate-400 sm:w-56"
                />
              </div>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 text-[11.5px] font-medium text-slate-200">
                <Percent className="h-3.5 w-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Odds</span>
                <Switch
                  checked={showOdds}
                  onCheckedChange={setShowOdds}
                  aria-label="Show research odds on tech cards"
                  className="data-[state=checked]:bg-cyan-400"
                />
              </label>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 text-[11.5px] font-medium text-slate-200">
                <EyeOff className="h-3.5 w-3.5 text-slate-300" />
                <span className="hidden sm:inline">Hide done</span>
                <Switch
                  checked={hideAcquired}
                  onCheckedChange={setHideAcquired}
                  aria-label="Hide researched technologies"
                  className="data-[state=checked]:bg-emerald-400"
                />
              </label>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Load
              </Button>

              <Button
                onClick={() => setSaveOpen(true)}
                className="h-9 bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
              >
                <Download className="h-3.5 w-3.5" />
                Save
              </Button>

              {/* undo / redo / reset — research history */}
              <div
                data-history-controls
                className="flex h-9 items-center overflow-hidden rounded-md border border-slate-700 bg-slate-900/70"
              >
                <button
                  type="button"
                  onClick={undo}
                  disabled={undoPast.length === 0}
                  aria-label="Undo last research change"
                  title="Undo last research change (Ctrl+Z)"
                  className="flex h-full w-8 items-center justify-center text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={redoFuture.length === 0}
                  aria-label="Redo research change"
                  title="Redo research change (Ctrl+Shift+Z)"
                  className="flex h-full w-8 items-center justify-center text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
                <span aria-hidden className="h-4 w-px bg-slate-700" />
                <button
                  type="button"
                  onClick={resetProgress}
                  aria-label="Reset research progress"
                  title={
                    confirmReset
                      ? "Click again to confirm — unchecks every researched tech (undoable)"
                      : "Uncheck every researched tech (undoable)"
                  }
                  className={[
                    "flex h-full items-center gap-1 px-2.5 text-[11.5px] font-semibold transition-colors",
                    confirmReset
                      ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  ].join(" ")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {confirmReset ? "Sure?" : "Reset"}
                </button>
              </div>

              {/* named save slots */}
              <Popover open={slotsOpen} onOpenChange={setSlotsOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Named progress slots — keep several campaigns side by side"
                    className="flex h-9 max-w-[190px] items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-3 text-[11.5px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />
                    <span className="max-w-[110px] truncate">
                      {activeSlot?.name ?? "Main progress"}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 border-slate-700 bg-[#0b1120] p-2.5"
                >
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
                    Progress slots
                  </p>
                  <div className="space-y-0.5">
                    {slotRegistry.slots.map((s) => {
                      const active = s.id === slotRegistry.activeId;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-slate-800/60"
                          style={active ? { background: "rgba(251,191,36,.08)" } : undefined}
                        >
                          {renamingId === s.id ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onBlur={() => {
                                renameSlot(s.id, renameDraft);
                                setRenamingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameSlot(s.id, renameDraft);
                                  setRenamingId(null);
                                } else if (e.key === "Escape") {
                                  setRenamingId(null);
                                }
                              }}
                              className="min-w-0 flex-1 rounded border border-amber-400/50 bg-slate-950 px-1.5 py-0.5 text-[12px] text-slate-100 outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                switchSlot(s.id);
                                setSlotsOpen(false);
                              }}
                              className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-slate-200 hover:text-white"
                            >
                              {active && (
                                <span
                                  aria-hidden
                                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-300 align-middle"
                                />
                              )}
                              {s.name}
                            </button>
                          )}
                          <button
                            type="button"
                            title="Rename slot"
                            aria-label={`Rename ${s.name}`}
                            onClick={() => {
                              setRenamingId(s.id);
                              setRenameDraft(s.name);
                            }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Duplicate slot"
                            aria-label={`Duplicate ${s.name}`}
                            onClick={() => duplicateSlot(s.id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title={
                              slotRegistry.slots.length <= 1
                                ? "Keep at least one slot"
                                : "Delete slot"
                            }
                            aria-label={`Delete ${s.name}`}
                            disabled={slotRegistry.slots.length <= 1}
                            onClick={() => deleteSlot(s.id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-rose-500/20 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-800 pt-2">
                    <input
                      value={newSlotName}
                      onChange={(e) => setNewSlotName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSlotName.trim() !== "") {
                          createSlot(newSlotName.trim());
                          setNewSlotName("");
                        }
                      }}
                      placeholder="New slot name…"
                      className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-400/60"
                    />
                    <button
                      type="button"
                      disabled={newSlotName.trim() === ""}
                      onClick={() => {
                        createSlot(newSlotName.trim());
                        setNewSlotName("");
                      }}
                      className="flex h-7 shrink-0 items-center gap-1 rounded border border-amber-400/50 bg-amber-400/15 px-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-400/25 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      New
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                    Each slot keeps its own researched techs, empire, rates and
                    goal. The active slot always saves automatically.
                  </p>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                onClick={() => setShareOpen(true)}
                className="h-9 border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="How research works — primer, shortcuts and glossary (?)"
                aria-label="Open the help guide"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-400/60 hover:text-cyan-200"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* tabs + zoom + filter toggle */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* tech-tree view tabs */}
            {TAB_META.filter((m) => !TOOL_TABS.has(m.id)).map(renderTab)}

            {/* tool tabs — My Empire, Ships and Empire Creator are evenly
                spaced inside their own group, set apart from the tech-tree
                tabs by a divider and extra margin */}
            <div className="ml-6 flex flex-wrap items-center gap-3 border-l border-slate-700/80 pl-5">
              {TAB_META.filter((m) => TOOL_TABS.has(m.id)).map(renderTab)}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {/* zoom slider — tree tabs only */}
              {!TOOL_TABS.has(tab) && (
                <div
                  data-zoom-control
                  title="Zoom the tech tree — 40% to 150% (buttons step by 15%, or click the % number and type an exact value)"
                  className="flex items-center gap-1.5 rounded-full border border-slate-800 px-2.5 py-1 text-[12px] font-medium text-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => stepZoom(-0.15)}
                    disabled={zoom <= 0.4}
                    aria-label="Zoom out by 15%"
                    title="Zoom out by 15%"
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ZoomOut className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <input
                    type="range"
                    min={0.4}
                    max={1.5}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    aria-label="Tech tree zoom"
                    className="h-1 w-24 cursor-pointer accent-amber-400"
                  />
                  {/* clickable % readout — click to type an exact zoom level
                      (Enter/blur applies, Esc cancels, values clamped 40–150) */}
                  <span
                    title={"Click to type an exact zoom level (40–150)\nEnter or click away to apply, Esc to cancel"}
                    className="flex items-center rounded border border-transparent py-px pl-1 pr-px text-[10.5px] font-bold leading-none text-amber-300 transition-colors focus-within:border-amber-400/50 focus-within:bg-amber-400/10 hover:text-amber-200"
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      value={zoomDraft ?? String(Math.round(zoom * 100))}
                      aria-label="Tech tree zoom in percent"
                      onChange={(e) => setZoomDraft(e.target.value)}
                      onFocus={(e) => {
                        zoomCancelledRef.current = false;
                        const el = e.currentTarget;
                        requestAnimationFrame(() => el.select());
                      }}
                      onBlur={commitZoomDraft}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          zoomCancelledRef.current = true;
                          setZoomDraft(null);
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-7 cursor-text bg-transparent text-right text-[10.5px] font-bold text-amber-300 outline-none"
                    />
                    %
                  </span>
                  <button
                    type="button"
                    onClick={() => stepZoom(0.15)}
                    disabled={zoom >= 1.5}
                    aria-label="Zoom in by 15%"
                    title="Zoom in by 15%"
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  isFiltering
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white",
                ].join(" ")}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                DLC Filter
                <span className="text-[10px] font-semibold opacity-80">
                  {activeDlcCount}/{DLC_FILTER_LIST.length}
                </span>
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <DlcFilter
                dlcs={DLC_FILTER_LIST}
                counts={dlcStats.counts}
                acquiredByDlc={dlcStats.done}
                active={activeDlcs}
                onToggle={toggleDlc}
                onSetAll={setAllDlcs}
              />
            </div>
          )}
        </div>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="relative z-10 w-full flex-1 px-4 py-6">
        {tab === "empire" ? (
          <EmpireCreator
            activeDlcs={activeDlcs}
            onToggleDlc={toggleDlc}
            onSendToMyEmpire={handleSendToMyEmpire}
          />
        ) : tab === "ships" ? (
          <ShipsTab acquired={acquired} empireFacts={empireFacts} />
        ) : tab === "myempire" ? (
          <MyEmpireTab
            config={myEmpire}
            onApply={(cfg) => setMyEmpire(cfg)}
            onClear={() => setMyEmpire(null)}
            activeDlcs={activeDlcs}
            onViewTree={() => setTab("all")}
            hasAscensionTheory={acquired.has("tech_ascension_theory")}
            rates={rates}
            onRatesChange={setRates}
          />
        ) : (
          <>
        {/* playstyle presets + path-planner goal — tech-tree tabs only
            (this branch is not rendered for My Empire / Ships / Empire
            Creator), sitting above the early-game milestones; ratings
            only appear while a path is chosen */}
        <PresetBar
          activeId={presetId}
          onSelect={setPresetId}
          goal={goalInfo}
          onClearGoal={() => setGoalKey(null)}
          onViewGoal={redirectToTech}
          nextUp={nextUp}
          onLocate={redirectToTech}
        />

        <MilestonePanel done={milestonesDone} onToggle={toggleMilestone} />

        {search.trim() !== "" && (
          <p className="mb-4 text-xs text-slate-300">
            Showing{" "}
            <span className="font-semibold text-amber-300">
              {(tabCounts.get(tab) ?? 0).toLocaleString("en-US")}
            </span>{" "}
            {tabCounts.get(tab) === 1 ? "match" : "matches"} for “
            {search.trim()}” in {tab === "all" ? "all areas" : TAB_META.find((m) => m.id === tab)?.label}
          </p>
        )}

        {sections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <SearchX className="h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-200">
              No technologies match your current filters.
            </p>
            <p className="text-xs text-slate-400">
              Try clearing the search, re-enabling DLCs, or switching areas.
            </p>
            <Button
              variant="outline"
              onClick={resetFilters}
              className="mt-1 border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="space-y-10" style={{ zoom }}>
            {sections.map((s) => (
              <AreaSection
                key={s.id}
                id={s.id}
                title={s.title}
                accent={s.accent}
                techs={s.techs}
                countTechs={s.countTechs}
                acquired={acquired}
                hideAcquired={hideAcquired}
                categoryOrder={s.cats}
                spotlightKey={spotlight}
                readyKeys={readyKeys}
                blockedKeys={blockedKeys}
                flashKey={flashKey}
                hoverKey={hoverTraceKey}
                oddsMap={oddsMap}
                showOdds={showOdds}
                ratingsMap={ratingsMap}
                plannedKeys={plannedKeys}
                goalKey={goalKey}
                onSetGoal={handleSetGoal}
                permanentKeys={permanentKeys}
                onToggle={toggleAcquired}
                onHover={onHover}
              />
            ))}
          </div>
        )}
          </>
        )}
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="relative z-10 mt-auto border-t border-slate-800/60 py-4">
        <p className="px-4 text-center text-[11px] leading-relaxed text-slate-400">
          Fan-made research tracker · Data: Stellaris {GAME_VERSION} “Cetus” ·
          Tech tree data by Turanar &amp; BloodStainedCrow (MIT) · Not
          affiliated with Paradox Interactive
        </p>
      </footer>

      {/* overlays */}
      {hover && (
        <TechTooltip
          tech={hover.tech}
          rect={hover.rect}
          acquired={acquired}
          odds={oddsMap.get(hover.tech.key) ?? null}
          showOdds={showOdds}
          permanent={permanentKeys.has(hover.tech.key)}
          permanentNote={startTechNote(hover.tech.key)}
          lockReason={empireLocks.get(hover.tech.key) ?? null}
          rating={ratingsMap?.get(hover.tech.key) ?? null}
          presetName={activePreset?.name ?? null}
          monthlyRate={rates[hover.tech.area] ?? null}
          onDismiss={() => setHover(null)}
        />
      )}

      {/* trace chip: shown while a selected tech's unlocks are highlighted */}
      {spotlight && TECH_BY_KEY.get(spotlight) && (
        <div className="fixed bottom-5 left-1/2 z-40 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-full border border-amber-400/40 bg-[#0b1120]/95 py-2 pl-4 pr-2 shadow-2xl shadow-black/60 backdrop-blur-md">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400"
          />
          <p className="text-[11.5px] leading-tight text-slate-200">
            Tracing{" "}
            <span className="font-semibold text-slate-50">
              {TECH_BY_KEY.get(spotlight)!.name}
            </span>
            {" · "}
            <span className="font-semibold text-amber-300">gold lines</span>{" "}
            unlock next ·{" "}
            <span className="font-semibold text-cyan-300">cyan lines</span>{" "}
            are its prerequisites · click empty space to stop
          </p>
          <button
            type="button"
            onClick={() => setSpotlight(null)}
            aria-label="Stop tracing"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <SaveDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        acquiredCount={acquired.size}
        onSave={handleSave}
      />

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        getCode={getCode}
        onImport={importCode}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleLoadFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
