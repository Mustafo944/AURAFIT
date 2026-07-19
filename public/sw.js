const CACHE_NAME = "aurafit-v3";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/fonts/material-symbols-outlined.woff2"];

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
  
  // Faqat GET so'rovlarni keshlaymiz
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API yoki Supabase so'rovlarini SW orqali o'tkazmaymiz
  // Ma'lumotlarni IDB da o'zimiz boshqaramiz
  if (url.pathname.startsWith("/api/") || url.host.includes("supabase.co")) {
    return;
  }

  // HTML Sahifalar (Navigatsiya) -> Network First, falling back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Statik fayllar (_next/static, rasmlar, fontlar) -> Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Fonda yangilab qo'yamiz (Stale-while-revalidate g'oyasi)
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
          }
        }).catch(() => {});
        return cached;
      }
      
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});
