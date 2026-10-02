// Service worker Gate Scan — cache app shell agar halaman scan tetap bisa
// dibuka saat sinyal lemah. API calls tidak di-cache (network only).
const CACHE = "gate-scan-v1";
const SHELL = ["/scan", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // API dan halaman dinamis lain: langsung ke network (tidak di-cache).
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(
      (hit) => hit || fetch(event.request).catch(() => caches.match("/scan"))
    )
  );
});
