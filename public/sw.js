// Service worker: makes the dashboard installable and lets its shell open offline / instantly.
// It only caches this site's own files. API responses (another origin, private business data) are
// never cached, so numbers are always live and nothing sensitive is left on the device.

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

/** Best-effort cache write; a storage error never breaks the response already sent. */
const stash = (name, key, res) => caches.open(name).then((c) => c.put(key, res)).catch(() => {});

self.addEventListener("install", (event) => {
  // A failed precache (storage full, private mode) must not block the worker — it just starts with an empty cache.
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: network first so a new deploy shows up right away; the cached shell is the offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          stash(SHELL, "/", copy);
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error())),
    );
    return;
  }

  // Hashed build files never change under the same name: serve from cache, fetch once.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              stash(ASSETS, req, copy);
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Other own files (icons, manifest): cached copy now, refreshed in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            stash(SHELL, req, copy);
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
