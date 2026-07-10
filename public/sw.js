const CACHE_NAME = "aurafit-v2";
const STATIC_ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // POST so'rovlarni (login/signup/logout server action'lari) SW butunlay
  // chetlab o'tadi — Cache API GET bo'lmagan so'rovlarni saqlamaydi va
  // ularga aralashish faqat kechikish qo'shadi.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API va sahifa navigatsiyasi — har doim tarmoqdan (autentifikatsiyalangan,
  // foydalanuvchiga xos ma'lumot hech qachon keshdan eskirgan holda berilmasin).
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("/").then((cached) => cached ?? Response.error());
        }
        return new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Faqat haqiqiy statik resurslar (hashlangan JS/CSS, ikonlar) — cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});
