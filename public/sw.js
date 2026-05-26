const CACHE_NAME = 'thara-v6';
const STATIC_ASSETS = [
  '/thara-app/',
  '/thara-app/index.html',
  '/thara-app/LOGO.jpg',
  '/thara-app/icon-192.png',
  '/thara-app/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/'))
      )
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          if (event.request.destination === 'image') {
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f3f7f4" width="200" height="200"/></svg>';
            return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return new Response('غير متصل', { status: 408 });
        });
      })
    );
  }
});
