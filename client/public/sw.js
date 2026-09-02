/**
 * BHALYAM service worker — offline shell + asset cache.
 *
 * Deliberately minimal. This is a MULTIPLAYER app: nearly everything the
 * player actually does needs the socket server, so an ambitious "offline
 * game lounge" is a lie the prompt was never going to keep. What offline
 * support is honest here:
 *
 *   1. The app shell (index.html + JS/CSS bundles) survives a flaky
 *      connection, so a player on a train re-opens BHALYAM and sees the
 *      lounge instantly instead of the browser's offline dinosaur — the
 *      socket reconnects the moment the tunnel ends.
 *   2. Same-origin static assets (avatars, tile art) are cache-first;
 *      they never change between deploys.
 *   3. Cross-origin (fonts, Supabase) is NOT touched — opaque responses
 *      would bloat the cache and cannot be validated.
 *
 * Never cached: /room/* navigations. A stale room page with a dead socket
 * is worse than the offline page, because it looks like it should work.
 */

const CACHE = "bhalyam-shell-v1";
const SHELL = ["/", "/manifest.json", "/Bhalyam-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: leave alone

  // Room pages always go to the network — see header comment.
  if (req.mode === "navigate" && url.pathname.startsWith("/room/")) return;

  // Navigations: network-first, shell fallback when offline. This keeps
  // deploys live immediately (no stale HTML pinning old hashed bundles).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match("/"))),
    );
    return;
  }

  // Static assets: cache-first. Hashed build output is immutable; public/
  // art changes only between deploys, where the versioned CACHE name
  // bumps and clears it.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match("/"));
    }),
  );
});
