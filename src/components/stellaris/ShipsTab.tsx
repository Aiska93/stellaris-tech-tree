"use client";

/*
 * Ships tab — a game-style ship designer that generates the best possible
 * design for the selected hull, trait (offence / defence / balanced) and the
 * empire's policies (War Doctrine, Defense Preference) and damage perks.
 * Components come exclusively from technologies the user has researched —
 * the Refresh button re-reads the current research progress.
 */

import { useMemo, useState } from "react";
import {
  Anchor,
  Crosshair,
  Lock,
  RefreshCw,
  Scale,
  Shield,
  Swords,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  CORE_COMPONENTS,
  DEFENSES,
  HULLS,
  WEAPONS,
  generateDesign,
  unlockedHulls,
  type ShipClassId,
  type ShipTrait,
  type SlotAssignment,
} from "@/lib/ships";
import { TECHS, TECH_BY_KEY } from "@/lib/techtree";
import { BASE_PATH } from "@/lib/assetPath";
import type { EmpireFacts } from "@/lib/myEmpire";
import { WAR_DOCTRINES } from "@/lib/empireExtras";
import { useStoredValue } from "@/lib/useStoredSet";

const parseTrait = (raw: string): ShipTrait =>
  raw === "offence" || raw === "defence" ? raw : "balanced";
const parseClass = (raw: string): ShipClassId => {
  const hit = HULLS.find((h) => h.id === raw);
  return hit ? hit.id : "corvette";
};

const TRAIT_META: {
  id: ShipTrait;
  name: string;
  icon: typeof Swords;
  desc: string;
  color: string;
}[] = [
  {
    id: "offence",
    name: "Offence",
    icon: Swords,
    desc: "Alpha-strike doctrine — spinal weapons, torpedoes, 60% energy loadout",
    color: "#f87171",
  },
  {
    id: "defence",
    name: "Defence",
    icon: Shield,
    desc: "Fleet-in-being — point defense, carriers, heavier armor bias",
    color: "#4ade80",
  },
  {
    id: "balanced",
    name: "Balanced",
    icon: Scale,
    desc: "Line doctrine — even 50/50 kinetic & energy mix",
    color: "#60a5fa",
  },
];

/** top-down silhouettes, one per class */
const SHIP_PATHS: Record<ShipClassId, string> = {
  corvette:
    "M60 14 L74 58 L96 74 L74 84 L60 106 L46 84 L24 74 L46 58 Z",
  destroyer:
    "M50 10 L58 40 L86 52 L110 60 L86 70 L58 82 L50 112 L42 82 L14 70 L38 62 L42 40 Z",
  cruiser:
    "M60 8 L76 38 L104 52 L112 60 L104 68 L76 82 L60 112 L44 82 L16 68 L8 60 L16 52 L44 38 Z",
  battleship:
    "M62 6 L72 30 L98 42 L118 56 L98 66 L72 76 L62 114 L52 76 L26 66 L6 56 L26 42 L52 30 Z",
  titan:
    "M64 4 L74 28 L94 38 L120 50 L94 62 L74 72 L64 116 L54 72 L34 62 L8 50 L34 38 L54 28 Z",
  juggernaut:
    "M60 8 L92 22 L112 52 L112 68 L92 98 L60 112 L28 98 L8 68 L8 52 L28 22 Z M60 38 L78 46 L84 60 L78 74 L60 82 L42 74 L36 60 L42 46 Z",
};

function ShipSilhouette({
  id,
  size = 120,
  color = "#93c5fd",
}: {
  id: ShipClassId;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0"
    >
      <path
        d={SHIP_PATHS[id]}
        fill={`${color}1f`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
    </svg>
  );
}

const SLOT_LABEL: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  X: "Extra",
  G: "Guided",
  H: "Hangar",
  P: "PD",
  T: "Titan",
};

function SlotChip({ slot }: { slot: SlotAssignment }) {
  const w = slot.weapon;
  const d = slot.defense;
  const st = w?.sizes[slot.slot] ?? d?.sizes[slot.slot as "S" | "M" | "L"];
  const title = w
    ? `${w.name} (${SLOT_LABEL[slot.slot]}) — avg ${w.sizes[slot.slot]!.avg} dmg, ${w.sizes[slot.slot]!.cd}d cooldown, range ${w.sizes[slot.slot]!.range}, ${w.sizes[slot.slot]!.accuracy}% acc, ${w.sizes[slot.slot]!.tracking}% tracking, ${w.sizes[slot.slot]!.power} power${w.approx ? " · ≈ stats" : ""}${w.penetrating ? " · penetrates shields & armor" : ""}`
    : d
      ? `${d.name} (${SLOT_LABEL[slot.slot]}) — ${d.kind === "shield" ? "shields" : d.kind === "armor" ? "armor" : "hull"} ${d.sizes[slot.slot as "S" | "M" | "L"]!.value}${d.approx ? " · ≈ stats" : ""}`
      : "No component available — research the required technology";
  const isWeapon = slot.kind === "weapon";
  return (
    <span
      title={title}
      className={[
        "inline-flex min-w-0 items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-medium leading-tight",
        w || d
          ? isWeapon
            ? "border-rose-400/30 bg-rose-400/[0.08] text-rose-100"
            : "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100"
          : "border-slate-700/60 bg-slate-900/50 italic text-slate-500",
      ].join(" ")}
    >
      <span
        className="shrink-0 rounded-sm bg-black/40 px-1 text-[9px] font-extrabold"
        style={{ color: isWeapon ? "#fda4af" : "#86efac" }}
      >
        {slot.slot}
      </span>
      <span className="max-w-[150px] truncate">
        {w?.name ?? d?.name ?? "— empty"}
        {st && w ? (
          <span className="ml-1 text-[9px] text-slate-400">
            {(w.sizes[slot.slot]!.avg / w.sizes[slot.slot]!.cd).toFixed(1)}/d
          </span>
        ) : null}
      </span>
    </span>
  );
}

interface ShipsTabProps {
  /** technologies the user has researched */
  acquired: ReadonlySet<string>;
  /** the applied empire (policies + perks drive the design) */
  empireFacts: EmpireFacts | null;
}

export function ShipsTab({ acquired, empireFacts }: ShipsTabProps) {
  const [trait, setTrait] = useStoredValue(
    "stellaris-ship-trait-v1",
    "balanced",
    parseTrait,
    String,
  );
  const [shipClass, setShipClass] = useStoredValue(
    "stellaris-ship-class-v1",
    "corvette",
    parseClass,
    String,
  );
  const [syncCount, setSyncCount] = useState(0);

  const unlocked = useMemo(() => unlockedHulls(acquired), [acquired]);
  const unlockedIds = useMemo(
    () => new Set(unlocked.map((h) => h.id)),
    [unlocked],
  );
  const activeHull =
    HULLS.find((h) => h.id === shipClass) ?? HULLS[0];
  const hullUnlocked = unlockedIds.has(activeHull.id);

  const design = useMemo(
    () =>
      generateDesign(
        activeHull,
        trait,
        acquired,
        empireFacts?.policies ?? null,
        empireFacts?.perks ?? new Set<string>(),
      ),
    [activeHull, trait, acquired, empireFacts],
  );

  /** techs that actually contribute components (for the refresh summary) */
  const contributingTechs = useMemo(() => {
    const used = new Set<string>();
    for (const w of WEAPONS) if (w.tech && acquired.has(w.tech)) used.add(w.tech);
    for (const d of DEFENSES) if (d.tech && acquired.has(d.tech)) used.add(d.tech);
    for (const c of CORE_COMPONENTS) if (c.tech && acquired.has(c.tech)) used.add(c.tech);
    for (const h of HULLS) if (h.tech && acquired.has(h.tech)) used.add(h.tech);
    return used;
  }, [acquired]);

  const refresh = () => {
    setSyncCount((n) => n + 1);
    toast.success("Ship designs refreshed", {
      description: `${acquired.size} researched technologies applied — ${contributingTechs.size} of them provide ship components. New designs use the best researched weapons, defenses and cores.`,
    });
  };

  /* aggregate weapons for the stats table */
  const weaponRows = useMemo(() => {
    const m = new Map<
      string,
      { name: string; count: number; dps: number; range: number; avg: number; cd: number; acc: number; tracking: number; approx: boolean }
    >();
    for (const sec of design.sections) {
      for (const s of sec.slots) {
        if (s.kind !== "weapon" || !s.weapon) continue;
        const st = s.weapon.sizes[s.slot]!;
        const dps = st.avg / st.cd;
        const hit = m.get(s.weapon.name) ?? {
          name: s.weapon.name,
          count: 0,
          dps: 0,
          range: st.range,
          avg: st.avg,
          cd: st.cd,
          acc: st.accuracy,
          tracking: st.tracking,
          approx: s.weapon.approx ?? false,
        };
        hit.count += 1;
        hit.dps += dps;
        m.set(s.weapon.name, hit);
      }
    }
    return [...m.values()].sort((a, b) => b.dps - a.dps);
  }, [design]);

  const doctrine = WAR_DOCTRINES.find(
    (d) => d.id === empireFacts?.policies.warDoctrine && d.id !== "none",
  );

  const fmt = (n: number) =>
    n >= 100 ? Math.round(n).toLocaleString("en-US") : (Math.round(n * 10) / 10).toString();

  return (
    <section id="ships" className="scroll-mt-40">
      {/* ---------- header ---------- */}
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/40 bg-gradient-to-br from-blue-400/20 to-indigo-600/10"
        >
          <Anchor className="h-5 w-5 text-blue-300" />
        </span>
        <h2
          className="text-base font-semibold uppercase tracking-[0.18em] text-slate-50"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Ship Designer
        </h2>
        <span className="text-xs text-slate-300">
          Best possible design per hull — built from your researched
          technologies
        </span>
        <span
          aria-hidden
          className="h-px min-w-8 flex-1"
          style={{ background: "linear-gradient(to right, #3b82f666, transparent)" }}
        />
        <button
          type="button"
          onClick={refresh}
          data-ships-refresh
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 text-[12.5px] font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-400 hover:to-indigo-400"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncCount % 2 === 1 ? "rotate-180" : ""} transition-transform`}
          />
          Refresh from research
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* ---------------- left rail: trait + hull list ---------------- */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-blue-400/20 bg-slate-950/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Design trait
            </p>
            <div className="mt-2 space-y-1.5">
              {TRAIT_META.map((t) => {
                const on = trait === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    data-ship-trait={t.id}
                    onClick={() => setTrait(t.id)}
                    title={t.desc}
                    className={[
                      "flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition-all",
                      on ? "shadow-md" : "hover:brightness-125",
                    ].join(" ")}
                    style={{
                      borderColor: on ? `${t.color}aa` : "rgba(100,116,139,0.3)",
                      background: on ? `${t.color}1c` : "rgba(2,6,23,0.5)",
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: on ? t.color : "#94a3b8" }}
                    />
                    <span className="min-w-0">
                      <span
                        className="block text-[12px] font-bold leading-tight"
                        style={{ color: on ? t.color : "#cbd5e1" }}
                      >
                        {t.name}
                      </span>
                      <span className="block text-[9px] leading-tight text-slate-400">
                        {t.desc.split("—")[0]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-blue-400/20 bg-slate-950/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Ship class
            </p>
            <div className="mt-2 space-y-1">
              {HULLS.map((h) => {
                const on = h.id === activeHull.id;
                const locked = !unlockedIds.has(h.id);
                const hullTech = h.tech ? TECH_BY_KEY.get(h.tech) : null;
                return (
                  <button
                    key={h.id}
                    type="button"
                    aria-pressed={on}
                    disabled={locked}
                    data-ship-class={h.id}
                    onClick={() => setShipClass(h.id)}
                    title={
                      locked
                        ? `Requires the ${hullTech?.name ?? h.tech} technology`
                        : `${h.name} — ${h.desc}`
                    }
                    className={[
                      "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
                      locked
                        ? "cursor-not-allowed border-slate-800 opacity-45"
                        : on
                          ? "border-blue-400/70 bg-blue-400/15 shadow-md"
                          : "border-slate-700/60 hover:border-blue-400/50",
                    ].join(" ")}
                  >
                    <ShipSilhouette
                      id={h.id}
                      size={30}
                      color={on ? "#93c5fd" : "#64748b"}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[11.5px] font-bold leading-tight"
                        style={{ color: on ? "#bfdbfe" : "#cbd5e1" }}
                      >
                        {h.name}
                      </span>
                      <span className="block text-[9px] leading-tight text-slate-400">
                        hull {h.hull.toLocaleString("en-US")} · {h.evasion}% evasion
                      </span>
                    </span>
                    {locked && (
                      <Lock
                        className="h-3.5 w-3.5 shrink-0 text-slate-500"
                        aria-label={`Requires ${hullTech?.name ?? h.tech}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------------- center: designer ---------------- */}
        <div
          className="relative overflow-hidden rounded-xl border border-blue-400/25 p-4"
          style={{
            background:
              "linear-gradient(160deg, rgba(13,27,52,0.92), rgba(7,12,24,0.95))",
          }}
          data-ship-designer
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url(${BASE_PATH}/patterns/stars-ships.svg)`,
              backgroundSize: "500px 500px",
            }}
          />
          <div className="relative">
            {!hullUnlocked && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-[11.5px] font-semibold text-rose-200">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                {activeHull.name} is locked — research{" "}
                {TECH_BY_KEY.get(activeHull.tech!)?.name ?? activeHull.tech} first.
              </p>
            )}

            {/* ship title + silhouette + core components */}
            <div className="flex flex-wrap items-start gap-4">
              <div className="relative shrink-0">
                <ShipSilhouette id={activeHull.id} size={132} color="#93c5fd" />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded border border-blue-400/40 bg-[#050914]/90 px-2 py-px text-[9.5px] font-extrabold uppercase tracking-widest text-blue-200">
                  {activeHull.name}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-50">
                  {trait === "offence" ? "Offensive" : trait === "defence" ? "Defensive" : "Balanced"}{" "}
                  {activeHull.name} — best researched loadout
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                  {activeHull.desc}
                </p>
                {/* core components strip */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {design.cores.map((c) => (
                    <span
                      key={c.id}
                      title={`${c.name}${c.approx ? " (≈)" : ""}${
                        c.kind === "reactor"
                          ? ` — +${c.value} power`
                          : c.kind === "thruster"
                            ? ` — +${c.value} evasion & sublight speed`
                            : c.kind === "sensor"
                              ? ` — +${c.value} tracking`
                              : c.value > 0
                                ? ` — +${Math.round(c.value * 100)}% fire rate`
                                : ""
                      }`}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-300/30 bg-blue-300/10 px-1.5 py-1 text-[10px] font-semibold text-blue-100"
                    >
                      <Zap className="h-2.5 w-2.5 text-cyan-300" aria-hidden />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* sections with slots */}
            <div className="mt-4 grid gap-2.5 md:grid-cols-3">
              {design.sections.map((sec) => (
                <div
                  key={sec.pos}
                  className="rounded-lg border border-slate-700/60 bg-[#050914]/70 p-2.5"
                >
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">
                    <Crosshair className="h-3 w-3" aria-hidden />
                    {sec.option.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sec.slots.map((s, i) => (
                      <SlotChip key={i} slot={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* doctrine note */}
            {doctrine && (
              <p
                className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/[0.07] px-3 py-1.5 text-[10.5px] font-medium text-rose-200"
                title={doctrine.desc}
              >
                War Doctrine — {doctrine.name}: {doctrine.desc}
              </p>
            )}
          </div>
        </div>

        {/* ---------------- right: stats ---------------- */}
        <div
          className="rounded-xl border border-blue-400/25 bg-slate-950/70 p-3.5"
          data-ship-stats
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
            Ship statistics
          </p>

          {/* headline numbers */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-rose-400/25 bg-rose-400/[0.07] p-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-rose-300/80">
                Damage / day
              </p>
              <p className="text-[18px] font-extrabold leading-tight text-rose-100">
                {fmt(design.stats.dpsDoctrined)}
              </p>
            </div>
            <div className="rounded-lg border border-blue-400/25 bg-blue-400/[0.07] p-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-300/80">
                Avg. range
              </p>
              <p className="text-[18px] font-extrabold leading-tight text-blue-100">
                {fmt(design.stats.avgRange)}
              </p>
            </div>
          </div>

          {/* weapon table */}
          <div className="mt-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Weapons
            </p>
            <table className="mt-1 w-full text-[10px]">
              <thead>
                <tr className="text-left text-[9px] uppercase tracking-wide text-slate-500">
                  <th className="pb-1 font-semibold">Weapon</th>
                  <th className="pb-1 text-right font-semibold">×n</th>
                  <th className="pb-1 text-right font-semibold">Dmg</th>
                  <th className="pb-1 text-right font-semibold">DPS</th>
                  <th className="pb-1 text-right font-semibold">Rng</th>
                </tr>
              </thead>
              <tbody>
                {weaponRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-2 italic text-slate-500">
                      No weapons available — research weapon technologies.
                    </td>
                  </tr>
                )}
                {weaponRows.map((w) => (
                  <tr key={w.name} className="border-t border-slate-800/60">
                    <td className="py-1 pr-1 font-semibold text-slate-200">
                      {w.name}
                      {w.approx ? <span className="text-slate-500"> ≈</span> : null}
                    </td>
                    <td className="py-1 text-right tabular-nums text-slate-300">
                      ×{w.count}
                    </td>
                    <td className="py-1 text-right tabular-nums text-slate-300">
                      {fmt(w.avg)}
                    </td>
                    <td className="py-1 text-right font-bold tabular-nums text-rose-200">
                      {fmt(w.dps)}
                    </td>
                    <td className="py-1 text-right tabular-nums text-slate-300">
                      {w.range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* defense & mobility */}
          <div className="mt-2.5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Defense &amp; mobility
            </p>
            {[
              ["Shields", fmt(design.stats.shields), "#7dd3fc"],
              ["Armor", fmt(design.stats.armor), "#fbbf24"],
              ["Hull points", fmt(design.stats.hull), "#a3e635"],
              ["Evasion", `${design.stats.evasion}%`, "#e2e8f0"],
              ["Sublight speed", fmt(design.stats.speed), "#93c5fd"],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-2 text-[11px]"
              >
                <span className="text-slate-400">{label}</span>
                <span className="font-bold tabular-nums" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="text-slate-400">Power</span>
              <span
                className={[
                  "font-bold tabular-nums",
                  design.powerOverflow ? "text-rose-300" : "text-cyan-200",
                ].join(" ")}
                title={
                  design.powerOverflow
                    ? "Components draw more power than the reactor provides — the game would not allow this design; research better reactors."
                    : "Reactor output covers every installed component."
                }
              >
                {fmt(design.stats.powerUsed)} / {fmt(design.stats.powerAvailable)}
              </span>
            </div>
          </div>

          {/* doctrine / perk modifiers */}
          {(doctrine || design.stats.doctrineFireRate !== 1) && (
            <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-400/[0.07] px-2 py-1 text-[9.5px] leading-snug text-rose-200">
              Doctrine applied: ×{design.stats.doctrineFireRate} fire rate, ×
              {design.stats.doctrineRange} range, ×{design.stats.speedMult} speed
            </p>
          )}

          <p className="mt-2 text-[9px] leading-snug text-slate-500">
            Weapon/defense values: exact 4.5 wiki data for lasers, plasma,
            lances, particle launchers &amp; archaeotech lasers; others marked
            “≈” are classic approximations. Section layouts are simplified.
            Designs refresh automatically when you research new technologies —
            or hit Refresh.
          </p>
        </div>
      </div>
    </section>
  );
}
