const CACHE_NAME = 'docpackr-cache-v1';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Prefer cache-first for static assets and app shell
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => {
        // Cache only successful and same-origin GETs
        if (res.ok && new URL(req.url).origin === location.origin) {
          cache.put(req, copy);
        }
      });
      return res;
    }).catch(() => caches.match('/')))
  );
});

