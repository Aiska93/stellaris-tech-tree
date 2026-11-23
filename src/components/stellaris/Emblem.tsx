"use client";

/*
 * Circular emblem for traditions, ascension perks and policies — a colored
 * ring with a lucide glyph inside, echoing the game's circular tradition
 * icons. `icon` is a stable key stored in the data files (empireExtras).
 */

import {
  Atom,
  Ban,
  Blocks,
  Bone,
  BookOpen,
  Bot,
  Brain,
  Castle,
  Cog,
  Coins,
  Crosshair,
  Cpu,
  Crown,
  Flame,
  FlaskConical,
  Flower2,
  Globe,
  GraduationCap,
  Handshake,
  Landmark,
  Leaf,
  Medal,
  Network,
  Orbit,
  PawPrint,
  Rocket,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  Sword,
  Swords,
  Telescope,
  VenetianMask,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const EMBLEM_ICONS: Record<string, LucideIcon> = {
  atom: Atom,
  ban: Ban,
  blocks: Blocks,
  bone: Bone,
  "book-open": BookOpen,
  bot: Bot,
  brain: Brain,
  castle: Castle,
  cog: Cog,
  coins: Coins,
  crosshair: Crosshair,
  cpu: Cpu,
  crown: Crown,
  flask: FlaskConical,
  flame: Flame,
  flower: Flower2,
  globe: Globe,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  landmark: Landmark,
  leaf: Leaf,
  medal: Medal,
  network: Network,
  orbit: Orbit,
  "paw-print": PawPrint,
  rocket: Rocket,
  scale: Scale,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  ship: Ship,
  sparkles: Sparkles,
  sword: Sword,
  swords: Swords,
  telescope: Telescope,
  "venetian-mask": VenetianMask,
  wrench: Wrench,
};

interface EmblemProps {
  /** icon key from the data files (see EMBLEM_ICONS) */
  icon: string;
  /** ring + glyph color */
  color: string;
  /** overall size in px (default 28) */
  size?: number;
  /** dim the emblem (locked / unavailable) */
  dim?: boolean;
}

export function Emblem({ icon, color, size = 28, dim = false }: EmblemProps) {
  const Icon = EMBLEM_ICONS[icon] ?? Sparkles;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border transition-all"
      style={{
        width: size,
        height: size,
        borderColor: dim ? `${color}44` : `${color}cc`,
        background: dim
          ? `${color}0d`
          : `radial-gradient(circle at 32% 28%, ${color}38, ${color}12 70%)`,
        boxShadow: dim ? undefined : `0 0 7px ${color}30, inset 0 0 5px ${color}1f`,
        opacity: dim ? 0.45 : 1,
      }}
    >
      <Icon
        className="shrink-0"
        style={{ width: size * 0.5, height: size * 0.5, color: dim ? `${color}aa` : color }}
        strokeWidth={2.1}
      />
    </span>
  );
}
