const CACHE_NAME = 'thara-v15';
const BASE_PATH = new URL(self.registration.scope).pathname;
const LOCAL_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`.replace(/\/+/g, '/'),
  `${BASE_PATH}manifest.json`.replace(/\/+/g, '/'),
  `${BASE_PATH}icon-192.png`.replace(/\/+/g, '/'),
  `${BASE_PATH}icon-512.png`.replace(/\/+/g, '/'),
  `${BASE_PATH}icon-maskable-192.png`.replace(/\/+/g, '/'),
  `${BASE_PATH}icon-maskable-512.png`.replace(/\/+/g, '/'),
  `${BASE_PATH}logo222.jpg`.replace(/\/+/g, '/'),
];
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(LOCAL_ASSETS).then(() => {
        return Promise.allSettled(
          EXTERNAL_ASSETS.map((url) => fetch(url).then((r) => r.ok ? cache.put(url, r) : null).catch(() => null))
        );
      });
    })
  );
  self.skipWaiting();
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
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => null);
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached)
            .then((cached) => cached || caches.match(`${BASE_PATH}index.html`.replace(/\/+/g, '/')))
            .then((cached) => cached || caches.match(BASE_PATH))
            .then((cached) => cached || new Response('', { status: 503 }))
        )
    );
  } else {
    const isStaticAsset = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
    const isHtml = event.request.destination === 'document';

    if (isStaticAsset && url.origin !== self.location.origin) {
      return;
    }

    if (isStaticAsset || isHtml) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => null);
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          return response;
        }).catch(() => {
          if (event.request.destination === 'image') {
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f3f7f4" width="200" height="200"/></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
          }
          return new Response('', { status: 503 });
        });
      })
    );
  }
});
