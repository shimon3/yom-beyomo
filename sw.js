/* יום ביומו — service worker: app shell offline + cached study texts */
const VERSION = "yb-v7";
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

  // Page navigations: network first, fall back to the cached shell
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  // Study texts and calendars: network first, keep a copy for offline use
  if (url.hostname === "www.sefaria.org" || url.hostname === "www.hebcal.com") {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(DATA_CACHE).then(async c => { await c.delete(req); await c.put(req, copy); await trimDataCache(c); }).catch(() => {})); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Fonts and same-origin files: cache first, refresh in background
  if (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname === "fonts.googleapis.com") {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
