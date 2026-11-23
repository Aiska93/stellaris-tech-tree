/**
 * PWA / social asset generator.
 *
 * Produces from public/logo.svg (the Stellaris-style tile mark):
 *   - src/app/icon.png            64x64   (Next.js favicon file convention)
 *   - src/app/apple-icon.png      180x180 (iOS home-screen icon)
 *   - public/icons/icon-192.png   192x192 (manifest, purpose "any")
 *   - public/icons/icon-512.png   512x512 (manifest, purpose "any")
 *   - public/icons/icon-maskable-512.png  (manifest, purpose "maskable")
 *   - public/og-image.png         1200x630 (OpenGraph / Twitter card)
 *
 * Run: node scripts/gen_pwa_assets.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
const APP = path.join(ROOT, "src", "app");
const ICONS = path.join(PUB, "icons");

fs.mkdirSync(ICONS, { recursive: true });

/* The white glyph from public/logo.svg, 30x30 viewbox, centered ~ (15, 15). */
const GLYPH = `<path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z"/>
<polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"/>
<path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z"/>`;

/* seeded PRNG so starfields are reproducible */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dark rounded tile with amber border + white glyph — the site's app icon. */
function tileIconSvg(size) {
  const s = size;
  const b = Math.max(3, Math.round(s * 0.016)); // border width
  const inset = Math.max(4, Math.round(s * 0.03));
  const rx = Math.round(s * 0.19);
  const scale = (s * 0.5) / 18.6; // glyph is ~18.6 units wide in its 30-unit box
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131b31"/>
      <stop offset="100%" stop-color="#0b1120"/>
    </linearGradient>
  </defs>
  <rect x="${inset}" y="${inset}" width="${s - 2 * inset}" height="${s - 2 * inset}" rx="${rx}"
        fill="url(#g)" stroke="rgba(251,191,36,0.55)" stroke-width="${b}"/>
  <g fill="#f8fafc" transform="translate(${s / 2},${s / 2}) scale(${scale.toFixed(3)}) translate(-15,-15.005)">
    ${GLYPH}
  </g>
</svg>`;
}

/** Full-bleed square for Android adaptive-icon masks (safe zone = inner 80%). */
function maskableIconSvg() {
  const s = 512;
  const scale = (s * 0.42) / 18.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#0b1120"/>
  <circle cx="${s / 2}" cy="${s / 2}" r="196" fill="none" stroke="rgba(251,191,36,0.22)" stroke-width="3"/>
  <g fill="#f8fafc" transform="translate(${s / 2},${s / 2}) scale(${scale.toFixed(3)}) translate(-15,-15.005)">
    ${GLYPH}
  </g>
</svg>`;
}

/** 1200x630 social share image. */
function ogImageSvg() {
  const W = 1200;
  const H = 630;
  const rnd = mulberry32(4377);

  let stars = "";
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * W).toFixed(1);
    const y = (rnd() * H).toFixed(1);
    const r = (0.6 + rnd() * 1.6).toFixed(2);
    const o = (0.12 + rnd() * 0.4).toFixed(2);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e2e8f0" opacity="${o}"/>`;
  }

  const F = "DejaVu Sans";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="amber" cx="14%" cy="16%" r="55%">
      <stop offset="0%" stop-color="rgba(251,191,36,0.17)"/>
      <stop offset="100%" stop-color="rgba(251,191,36,0)"/>
    </radialGradient>
    <radialGradient id="cyan" cx="88%" cy="88%" r="60%">
      <stop offset="0%" stop-color="rgba(34,211,238,0.13)"/>
      <stop offset="100%" stop-color="rgba(34,211,238,0)"/>
    </radialGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(251,191,36,0.20)"/>
      <stop offset="100%" stop-color="rgba(34,211,238,0.10)"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#05070e"/>
  ${stars}
  <rect width="${W}" height="${H}" fill="url(#amber)"/>
  <rect width="${W}" height="${H}" fill="url(#cyan)"/>

  <!-- app tile -->
  <rect x="96" y="205" width="220" height="220" rx="44" fill="url(#tile)"
        stroke="rgba(251,191,36,0.55)" stroke-width="4"/>
  <g fill="#f8fafc" transform="translate(206,315) scale(7.1) translate(-15,-15.005)">
    ${GLYPH}
  </g>

  <!-- wordmark -->
  <text x="384" y="268" font-family="${F}" font-weight="bold" font-size="92"
        letter-spacing="6" fill="#f8fafc">STELLARIS</text>
  <text x="384" y="372" font-family="${F}" font-weight="bold" font-size="92"
        letter-spacing="6" fill="#fbbf24">TECH TREE</text>

  <!-- tagline -->
  <text x="388" y="432" font-family="${F}" font-size="27" fill="#c2cee0">Interactive research tracker for Stellaris 4.3.7</text>
  <text x="388" y="474" font-family="${F}" font-size="27" fill="#c2cee0">663 technologies &#183; DLC filters &#183; playstyle guides</text>

  <!-- footer strip -->
  <text x="96" y="574" font-family="${F}" font-size="23" letter-spacing="3"
        fill="#67e8f9">PATH PLANNER &#183; RESEARCH ODDS &#183; SAVE &amp; SHARE</text>
</svg>`;
}

async function render(svg, out, width = null, height = null) {
  let img = sharp(Buffer.from(svg));
  if (width) img = img.resize(width, height ?? width);
  await img.png().toFile(out);
  const meta = await sharp(out).metadata();
  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`${path.relative(ROOT, out)}  ${meta.width}x${meta.height}  ${kb} KB`);
}

(async () => {
  await render(tileIconSvg(64), path.join(APP, "icon.png"));
  await render(tileIconSvg(180), path.join(APP, "apple-icon.png"));
  await render(tileIconSvg(192), path.join(ICONS, "icon-192.png"));
  await render(tileIconSvg(512), path.join(ICONS, "icon-512.png"));
  await render(maskableIconSvg(), path.join(ICONS, "icon-maskable-512.png"));
  await render(ogImageSvg(), path.join(PUB, "og-image.png"));

  /* sanity: make sure images are not blank (mean luminance far from 0 and 255) */
  for (const f of [
    path.join(APP, "icon.png"),
    path.join(ICONS, "icon-512.png"),
    path.join(PUB, "og-image.png"),
  ]) {
    const { data, info } = await sharp(f).greyscale().raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (const v of data) sum += v;
    const mean = sum / data.length;
    console.log(`${path.basename(f)} mean luminance = ${mean.toFixed(1)} (expect 10..90, not 0/255)`);
  }
})();
