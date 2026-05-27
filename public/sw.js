const CACHE_NAME = 'thara-v10';
const STATIC_ASSETS = [
  '/thara-app/',
  '/thara-app/index.html',
  '/thara-app/manifest.json',
  '/thara-app/icon.png',
  '/thara-app/LOGO.jpg',
  '/thara-app/leaflet.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
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

  // Never cache API/auth traffic.
  if (url.hostname.includes('supabase.co')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/thara-app/index.html') || caches.match('/thara-app/'))
        )
    );
  } else {
    const isStaticAsset = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
    const isHtml = event.request.destination === 'document';

    // For HTML/static assets, prefer network then fallback to cache so users see new deploys quickly.
    if (isStaticAsset || isHtml) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
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
