/*
 * Stellaris Tech Tree — offline service worker.
 *
 * Strategy:
 *   - navigations  : network-first, cached app shell as offline fallback
 *   - static assets: cache-first (immutable — /_next/static is content
 *                    hashed, /img and /patterns never change)
 *
 * All matching is done scope-relative, so the worker works both at the root
 * and under a sub-path (GitHub Pages project sites serve under /<repo>/).
 *
 * The VERSION string below is the cache namespace: bump it whenever assets
 * should be treated as stale. Any change to this file triggers re-install,
 * which purges caches of other versions.
 */
const VERSION = "v1";
const SHELL_CACHE = `stt-shell-${VERSION}`;
const ASSET_CACHE = `stt-assets-${VERSION}`;

/* e.g. "/" in dev/standalone, "/stellaris-tech-tree/" on GitHub Pages */
const SCOPE = new URL(self.registration.scope).pathname;

/** scope-relative path of a request ("/img/x.png"), or null when out of scope */
const relPath = (pathname) =>
  pathname === SCOPE.slice(0, -1) ? "/" : pathname.startsWith(SCOPE) ? pathname.slice(SCOPE.length - 1) : null;

const SHELL_URL = self.registration.scope;

const CACHE_FIRST = [
  /^\/_next\/static\//,
  /^\/img\//,
  /^\/patterns\//,
  /^\/icons\//,
  /^\/(logo\.svg|og-image\.png|manifest\.webmanifest|robots\.txt)$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: "reload" })))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  const rel = relPath(url.pathname);
  if (rel === null) return;

  /* app navigation — network first so deploys show up, shell cached for offline */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(SHELL_CACHE)
            .then((cache) => cache.put(SHELL_URL, copy))
            .catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(SHELL_URL)
            .then((cached) => cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })),
        ),
    );
    return;
  }

  /* immutable static assets — cache first */
  if (CACHE_FIRST.some((re) => re.test(rel))) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res.ok && res.type === "basic") {
                const copy = res.clone();
                caches
                  .open(ASSET_CACHE)
                  .then((cache) => cache.put(req, copy))
                  .catch(() => {});
              }
              return res;
            })
            .catch(() => new Response("", { status: 504 })),
      ),
    );
  }
});
