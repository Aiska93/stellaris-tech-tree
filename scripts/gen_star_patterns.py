#!/usr/bin/env python3
"""
Generate one seamless, monochrome (pure white, no color) star-pattern SVG tile
per app tab. All tiles share the same visual language (tiny dust, dots, soft
glows, 4-point sparkles, plus-glints, shooting-star streaks) but each tab gets
a different mix / layout character and its own random seed.

Also generates the faint per-area tiles used on the tech cards themselves
(card-<area>.svg) — same star language, but much sparser and dimmer so the
card text stays perfectly readable.

Output: /home/z/my-project/public/patterns/*.svg
Tiles are referenced from globals.css (.stars-<tab> / .tech-card-stars).
"""

import math
import random
from pathlib import Path

TILE = 512
CARD_TILE = 192
OUT_DIR = Path("/home/z/my-project/public/patterns")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def sparkle_path(cx, cy, s, k_ratio=0.13):
    """4-point concave star (classic star glint) centred at cx,cy, arm length s."""
    k = s * k_ratio
    return (
        f"M {cx:.1f} {cy - s:.1f} "
        f"Q {cx + k:.1f} {cy - k:.1f} {cx + s:.1f} {cy:.1f} "
        f"Q {cx + k:.1f} {cy + k:.1f} {cx:.1f} {cy + s:.1f} "
        f"Q {cx - k:.1f} {cy + k:.1f} {cx - s:.1f} {cy:.1f} "
        f"Q {cx - k:.1f} {cy - k:.1f} {cx:.1f} {cy - s:.1f} Z"
    )


class Tile:
    def __init__(self, seed, size=TILE):
        self.size = size
        self.rnd = random.Random(seed)
        self.parts = []
        self.defs = []
        self._gid = 0

    def _uid(self, prefix):
        self._gid += 1
        return f"{prefix}{self._gid}"

    # ---- element builders (all keep a safe margin so tiling stays seamless) ----

    def dust(self, n, r=(0.4, 0.8), op=(0.16, 0.42)):
        for _ in range(n):
            x = self.rnd.uniform(3, self.size - 3)
            y = self.rnd.uniform(3, self.size - 3)
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def dots(self, n, r=(0.8, 1.4), op=(0.28, 0.58)):
        for _ in range(n):
            x = self.rnd.uniform(3, self.size - 3)
            y = self.rnd.uniform(3, self.size - 3)
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def bright(self, n, r=(1.4, 2.0), op=(0.5, 0.78)):
        for _ in range(n):
            x = self.rnd.uniform(4, self.size - 4)
            y = self.rnd.uniform(4, self.size - 4)
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def glow(self, n, r=(6, 11), core_op=(0.4, 0.6)):
        for _ in range(n):
            rr = self.rnd.uniform(*r)
            x = self.rnd.uniform(rr + 3, self.size - rr - 3)
            y = self.rnd.uniform(rr + 3, self.size - rr - 3)
            gid = self._uid("g")
            op = self.rnd.uniform(*core_op)
            self.defs.append(
                f'<radialGradient id="{gid}">'
                f'<stop offset="0" stop-color="#fff" stop-opacity="{op:.2f}"/>'
                f'<stop offset="0.35" stop-color="#fff" stop-opacity="{op * 0.3:.2f}"/>'
                f'<stop offset="1" stop-color="#fff" stop-opacity="0"/>'
                f"</radialGradient>"
            )
            self.parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}" fill="url(#{gid})"/>')

    def sparkles(self, n, s=(3.5, 6.0), op=(0.42, 0.8)):
        for _ in range(n):
            ss = self.rnd.uniform(*s)
            x = self.rnd.uniform(ss + 3, self.size - ss - 3)
            y = self.rnd.uniform(ss + 3, self.size - ss - 3)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<path d="{sparkle_path(x, y, ss)}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def pluses(self, n, arm=(2.4, 4.0), op=(0.28, 0.5)):
        for _ in range(n):
            a = self.rnd.uniform(*arm)
            x = self.rnd.uniform(a + 3, self.size - a - 3)
            y = self.rnd.uniform(a + 3, self.size - a - 3)
            o = self.rnd.uniform(*op)
            w = 0.7
            self.parts.append(
                f'<path d="M {x - a:.1f} {y:.1f} H {x + a:.1f} M {x:.1f} {y - a:.1f} V {y + a:.1f}" '
                f'stroke="#fff" stroke-opacity="{o:.2f}" stroke-width="{w}" stroke-linecap="round"/>'
            )

    def streaks(self, n, length=(22, 40), op=(0.2, 0.38)):
        """tiny shooting-star streaks pointing up-right"""
        for _ in range(n):
            ln = self.rnd.uniform(*length)
            ang = math.radians(self.rnd.uniform(-40, -18))
            dx, dy = math.cos(ang) * ln, math.sin(ang) * ln
            # keep fully inside the tile
            x1 = self.rnd.uniform(6, self.size - 6 - dx)
            y1 = self.rnd.uniform(6 - dy, self.size - 6)
            x2, y2 = x1 + dx, y1 + dy
            gid = self._uid("lg")
            self.defs.append(
                f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" '
                f'x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">'
                f'<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
                f'<stop offset="1" stop-color="#fff" stop-opacity="{self.rnd.uniform(*op):.2f}"/>'
                f"</linearGradient>"
            )
            self.parts.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="url(#{gid})" stroke-width="1" stroke-linecap="round"/>'
            )
            self.parts.append(
                f'<circle cx="{x2:.1f}" cy="{y2:.1f}" r="1" fill="#fff" fill-opacity="0.55"/>'
            )

    # ---- layout characters ----

    def clustered(self, centers, scatter, share, fn, *args, **kwargs):
        """place `share` of fn()'s elements around cluster centers instead of uniformly"""
        # simplistic: temporarily override uniform placement is complex; instead
        # callers use this via explicit cluster() below.
        raise NotImplementedError

    def cluster_dust(self, centers, scatter, n, r=(0.4, 0.9), op=(0.2, 0.5)):
        for _ in range(n):
            cx, cy = self.rnd.choice(centers)
            a = self.rnd.uniform(0, 2 * math.pi)
            d = abs(self.rnd.gauss(0, scatter))
            x = clamp(cx + math.cos(a) * d, 3, self.size - 3)
            y = clamp(cy + math.sin(a) * d, 3, self.size - 3)
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def cluster_dots(self, centers, scatter, n, r=(0.8, 1.5), op=(0.3, 0.62)):
        for _ in range(n):
            cx, cy = self.rnd.choice(centers)
            a = self.rnd.uniform(0, 2 * math.pi)
            d = abs(self.rnd.gauss(0, scatter))
            x = clamp(cx + math.cos(a) * d, 3, self.size - 3)
            y = clamp(cy + math.sin(a) * d, 3, self.size - 3)
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    def lattice_dots(self, cell, jitter, r=(0.7, 1.2), op=(0.26, 0.55), skip=0.18):
        """jittered grid — a subtle structured lattice"""
        n = self.size // cell
        for i in range(n):
            for j in range(n):
                x = clamp((i + 0.5) * cell + self.rnd.uniform(-jitter, jitter), 3, self.size - 3)
                y = clamp((j + 0.5) * cell + self.rnd.uniform(-jitter, jitter), 3, self.size - 3)
                if self.rnd.random() < skip:
                    continue  # occasional gap keeps it from looking like a mesh
                rr = self.rnd.uniform(*r)
                o = self.rnd.uniform(*op)
                self.parts.append(
                    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
                )

    def diagonal_dust(self, n, r=(0.35, 0.7), op=(0.14, 0.4), bands=5, width=26):
        """dust biased along gentle diagonal bands (flowing feel)"""
        for _ in range(n):
            band = self.rnd.randrange(bands)
            t = self.rnd.uniform(0, self.size)
            off = self.rnd.gauss(0, width)
            x = clamp(t, 3, self.size - 3)
            y = clamp(
                ((t * 0.35 + band * self.size / bands + off) % self.size),
                3,
                self.size - 3,
            )
            rr = self.rnd.uniform(*r)
            o = self.rnd.uniform(*op)
            self.parts.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.2f}" fill="#fff" fill-opacity="{o:.2f}"/>'
            )

    # ---- output ----

    def save(self, name):
        defs = "\n    ".join(self.defs)
        body = "\n    ".join(self.parts)
        s = self.size
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}">\n'
            f"  <defs>\n    {defs}\n  </defs>\n"
            f"  {body}\n"
            f"</svg>\n"
        )
        (OUT_DIR / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(f"wrote {name}.svg  ({len(self.parts)} elements)")


# ---------------------------------------------------------------- recipes ----
# every tab: same monochrome star language, different character


def tab_all():
    """balanced classic starfield"""
    t = Tile(seed=1042)
    t.dust(90)
    t.dots(34)
    t.bright(10)
    t.glow(5)
    t.sparkles(7, s=(3.5, 5.5))
    t.pluses(3)
    return t


def tab_physics():
    """sparse and sharp: pinpoint dust along diagonal flow, crisp glints"""
    t = Tile(seed=2027)
    t.diagonal_dust(120, r=(0.35, 0.68), op=(0.15, 0.4))
    t.dust(30)
    t.dots(16)
    t.bright(4)
    t.glow(3, r=(5, 8))
    t.sparkles(4, s=(3.0, 4.5))
    t.pluses(7)
    return t


def tab_society():
    """soft organic clusters with quieter voids between them"""
    t = Tile(seed=3311)
    rnd = random.Random(3311)
    centers = [
        (rnd.uniform(70, TILE - 70), rnd.uniform(70, TILE - 70)) for _ in range(7)
    ]
    t.cluster_dust(centers, scatter=46, n=85)
    t.cluster_dots(centers, scatter=34, n=40)
    t.dust(24)
    t.bright(5)
    t.glow(6, r=(7, 12))
    t.sparkles(5, s=(3.5, 5.5))
    t.pluses(2)
    return t


def tab_engineering():
    """structured: jittered lattice of dots with scattered dust"""
    t = Tile(seed=4404)
    t.lattice_dots(cell=68, jitter=20)
    t.dust(46)
    t.dots(10)
    t.bright(6)
    t.glow(4, r=(5, 8))
    t.sparkles(3, s=(3.0, 4.5))
    t.pluses(4)
    return t


def tab_events():
    """sparse field with prominent sparkles and shooting-star streaks"""
    t = Tile(seed=5519)
    t.dust(58)
    t.dots(14)
    t.bright(4)
    t.glow(4, r=(6, 10))
    t.sparkles(12, s=(3.5, 8.0), op=(0.5, 0.85))
    t.streaks(5)
    return t


def tab_myempire():
    """fine, dense, very quiet stardust"""
    t = Tile(seed=6633)
    t.dust(150, r=(0.35, 0.7), op=(0.1, 0.3))
    t.dots(18, r=(0.7, 1.1), op=(0.2, 0.42))
    t.bright(3)
    t.glow(3, r=(5, 8), core_op=(0.3, 0.45))
    t.sparkles(4, s=(3.0, 4.5), op=(0.35, 0.6))
    return t


def tab_ships():
    """naval chart: crisp dust lanes plus bold single glints like running lights"""
    t = Tile(seed=9021)
    t.diagonal_dust(90, r=(0.35, 0.65), op=(0.13, 0.36), bands=4, width=34)
    t.dust(36)
    t.dots(18)
    t.bright(7)
    t.glow(4, r=(5, 9))
    t.sparkles(5, s=(3.5, 6.0))
    t.streaks(3)
    return t


def tab_empire():
    """medium-bright field with a few bolder glints"""
    t = Tile(seed=7748)
    t.dust(95)
    t.dots(28)
    t.bright(12)
    t.glow(6, r=(6, 11))
    t.sparkles(6, s=(4.0, 6.5))
    t.pluses(2)
    t.streaks(2)
    return t


# ----------------------------------------------------- tech card tiles ----
# Same monochrome star language as the tab backgrounds, but much sparser and
# dimmer: cards are small and covered in text, so the pattern must stay a
# whisper-quiet, see-through texture. Each research area keeps the character
# of its tab pattern (physics = diagonal flow, society = soft clusters,
# engineering = lattice, events = sparkles + streaks).


def card_physics():
    t = Tile(seed=8117, size=CARD_TILE)
    t.diagonal_dust(34, r=(0.35, 0.62), op=(0.08, 0.2), bands=4, width=18)
    t.dust(10, r=(0.35, 0.6), op=(0.08, 0.18))
    t.dots(5, r=(0.7, 1.0), op=(0.12, 0.24))
    t.bright(1, r=(1.0, 1.3), op=(0.16, 0.24))
    t.sparkles(2, s=(2.2, 3.2), op=(0.14, 0.26))
    t.pluses(2, arm=(1.8, 2.6), op=(0.1, 0.2))
    return t


def card_society():
    t = Tile(seed=8234, size=CARD_TILE)
    rnd = random.Random(8234)
    centers = [
        (rnd.uniform(30, CARD_TILE - 30), rnd.uniform(30, CARD_TILE - 30))
        for _ in range(4)
    ]
    t.cluster_dust(centers, scatter=26, n=30, r=(0.35, 0.7), op=(0.08, 0.2))
    t.cluster_dots(centers, scatter=18, n=8, r=(0.7, 1.1), op=(0.12, 0.26))
    t.dust(8, r=(0.35, 0.6), op=(0.07, 0.16))
    t.glow(1, r=(4.5, 7), core_op=(0.1, 0.16))
    t.sparkles(2, s=(2.2, 3.2), op=(0.13, 0.24))
    return t


def card_engineering():
    t = Tile(seed=8351, size=CARD_TILE)
    t.lattice_dots(cell=64, jitter=16, r=(0.55, 0.9), op=(0.1, 0.22), skip=0.35)
    t.dust(12, r=(0.35, 0.6), op=(0.07, 0.17))
    t.dots(4, r=(0.7, 1.0), op=(0.11, 0.22))
    t.pluses(2, arm=(1.8, 2.6), op=(0.1, 0.2))
    t.sparkles(1, s=(2.2, 3.0), op=(0.13, 0.22))
    return t


def card_events():
    t = Tile(seed=8478, size=CARD_TILE)
    t.dust(20, r=(0.35, 0.65), op=(0.08, 0.19))
    t.dots(6, r=(0.7, 1.05), op=(0.12, 0.25))
    t.bright(1, r=(1.0, 1.3), op=(0.15, 0.23))
    t.glow(1, r=(4.5, 7), core_op=(0.1, 0.16))
    t.sparkles(3, s=(2.4, 3.8), op=(0.15, 0.28))
    t.streaks(1, length=(14, 22), op=(0.1, 0.18))
    return t


if __name__ == "__main__":
    tab_all().save("stars-all")
    tab_physics().save("stars-physics")
    tab_society().save("stars-society")
    tab_engineering().save("stars-engineering")
    tab_events().save("stars-events")
    tab_myempire().save("stars-myempire")
    tab_empire().save("stars-empire")
    tab_ships().save("stars-ships")
    card_physics().save("card-physics")
    card_society().save("card-society")
    card_engineering().save("card-engineering")
    card_events().save("card-events")
