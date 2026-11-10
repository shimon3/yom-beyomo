/* יום ביומו — service worker: app shell offline + cached study texts */
const VERSION = "yb-v12";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.png", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const DATA_CACHE = "yb-data-v2";
const MAX_DATA_ENTRIES = 180;
async function trimDataCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_DATA_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_DATA_ENTRIES).map(key => cache.delete(key)));
  }
}

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== DATA_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache private routes, APIs, or authenticated responses.
  if (url.origin === location.origin && (url.pathname.startsWith("/api/") || url.pathname === "/stats" || url.pathname.startsWith("/stats/") || url.pathname.startsWith("/dvar-malkhout"))) return;

  // Only the public homepage can fall back to the offline app shell.
  if (req.mode === "navigate") {
    if (url.origin !== location.origin || !["/", "/index.html"].includes(url.pathname)) return;
    e.respondWith(fetch(req).catch(async () => (await caches.match("/index.html")) || Response.error()));
    return;
  }

  // Study texts and calendars: network first, keep a copy for offline use
  if (url.hostname === "www.sefaria.org" || url.hostname === "www.hebcal.com") {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && !/no-store|private/i.test(res.headers.get("cache-control") || "")) { const copy = res.clone(); e.waitUntil(caches.open(DATA_CACHE).then(async c => { await c.delete(req); await c.put(req, copy); await trimDataCache(c); }).catch(() => {})); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Fonts and same-origin files: cache first, refresh in background
  const publicAsset = url.origin === location.origin && (SHELL.includes(url.pathname) || url.pathname === "/sw.js" || /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname));
  if (publicAsset || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if ((res.ok || res.type === "opaque") && !req.headers.has("authorization") && !/no-store|private/i.test(res.headers.get("cache-control") || "")) { const copy = res.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {})); }
          return res;
        }).catch(() => hit);
        return (url.origin === location.origin && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/sw.js")) ? net : (hit || net);
      })
    );
  }
});
