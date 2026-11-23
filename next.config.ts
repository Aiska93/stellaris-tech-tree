import type { NextConfig } from "next";

/**
 * Two output modes:
 *  - standalone (default): regular Next.js server build (used by the dev
 *    workflow and self-hosting)
 *  - export: fully static site in ./out, for GitHub Pages — set
 *    NEXT_STATIC_EXPORT=1 at build time
 *
 * GitHub Pages serves project repositories under /<repo-name>/, so the Pages
 * workflow also sets NEXT_PUBLIC_BASE_PATH=/stellaris-tech-tree (see
 * src/lib/assetPath.ts for how public assets pick it up).
 */
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
