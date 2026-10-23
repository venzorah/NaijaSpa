const CACHE = "naijaspa-shell-v1";
const SHELL = ["/", "/brand/icon-white.png", "/brand/logo-horizontal.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/vendor") || url.pathname.startsWith("/account") || url.pathname.startsWith("/checkout")) {
    return;
  }
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req);
      return cached || caches.match("/offline.html");
    })
  );
});
