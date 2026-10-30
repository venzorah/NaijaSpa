const CACHE = "naijaspa-shell-v11";
const SHELL = ["/", "/brand/splash-logo.png", "/splash/icon-512.png", "/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Show a generic alert for malformed payloads. */ }
  if (!data || typeof data !== "object") data = {};
  const url = typeof data.url === "string" && data.url.startsWith("/account/") && !data.url.includes("\\") ? data.url : "/account/bookings";
  event.waitUntil(self.registration.showNotification(typeof data.title === "string" ? data.title.slice(0, 100) : "NaijaSpa update", {
    body: typeof data.body === "string" ? data.body.slice(0, 250) : "Open NaijaSpa to see your update.",
    icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag.slice(0, 150) : "naijaspa-update", data: { url }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" && raw.startsWith("/account/") && !raw.includes("\\") ? raw : "/account/bookings";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  }));
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
