const CACHE_NAME = "aurafit-v4";
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/fonts/material-symbols-outlined.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith("aurafit-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Faqat GET so'rovlarni keshlaymiz
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API yoki Supabase so'rovlarini SW orqali o'tkazmaymiz
  // Ma'lumotlarni IDB da o'zimiz boshqaramiz
  if (url.origin !== self.location.origin) {
    return;
  }

  // Account HTML must never enter a cache shared by different signed-in users.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/offline.html")) ?? Response.error();
      }),
    );
    return;
  }

  // Only public static assets; excludes APIs, RSC payloads and user avatars.
  if (!STATIC_ASSETS.includes(url.pathname) && !url.pathname.startsWith("/_next/static/")) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        try {
          await cache.put(request, response.clone());
        } catch {
          // Storage exhaustion must not prevent a successful network response.
        }
      }
      return response;
    })(),
  );
});
