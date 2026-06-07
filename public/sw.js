const CACHE_NAME = 'thara-v16';
const CACHE_NAME = 'thara-v17';
const BASE_PATH = new URL(self.registration.scope).pathname;
const LOCAL_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`.replace(/\/+/g, '/'),
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
];

// Shared stale-while-revalidate helper
const staleWhileRevalidate = (request) => {
  const cached = caches.match(request);
  const fetched = fetch(request, { cache: 'no-store' }).then((response) => {
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => null);
    }
    return response;
  }).catch(() => null);
  return cached.then((r) => r || fetched);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(LOCAL_ASSETS).then(() => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) return;

  // Navigate: stale-while-revalidate with HTML fallback chain
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request, { cache: 'no-store' })
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => null);
            }
            return response;
          })
          .catch(() => null);
        return cached || fetchPromise;
      })
      staleWhileRevalidate(event.request)
        .then((r) => r || caches.match(`${BASE_PATH}index.html`.replace(/\/+/g, '/')))
        .then((r) => r || caches.match(BASE_PATH))
        .then((r) => r || new Response('', { status: 503 }))
    );
  } else {
    const isStaticAsset = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
    const isHtml = event.request.destination === 'document';
    return;
  }

    if (isStaticAsset && url.origin !== self.location.origin) {
      return;
    }
  const isStaticAsset = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
  const isHtml = event.request.destination === 'document';

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
  if (isStaticAsset && url.origin !== self.location.origin) {
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
  // Static assets + HTML: stale-while-revalidate (serve cached, update in background)
  if (isStaticAsset || isHtml) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Everything else: cache-first with fallback
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
});