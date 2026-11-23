/**
 * Deploy base path for public assets.
 *
 * Empty in development and standalone builds (assets live at /img, /patterns…).
 * When the site is statically exported for GitHub Pages project hosting the
 * workflow sets NEXT_PUBLIC_BASE_PATH=/stellaris-tech-tree, and every public
 * asset reference is prefixed with it. Inlined at build time by Next.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
