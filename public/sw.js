const CACHE_NAME = "aurafit-v1";
const STATIC_ASSETS = [
  "/",
  "/workouts",
  "/analytics",
  "/profile",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — kesh statik resurslarni
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — eski keshlarni tozalash
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network-first strategiya (API uchun), Cache-first (statik uchun)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API so'rovlari — faqat tarmoqdan
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: "Offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // Boshqa barcha so'rovlar — Cache-first, keyin Network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Faqat muvaffaqiyatli javoblarni keshla
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    }).catch(() => caches.match("/"))
  );
});
