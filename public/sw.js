const CACHE_NAME = 'thara-v20';
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
    }).then(() => self.clients.claim())
  );
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
      staleWhileRevalidate(event.request)
        .then((r) => r || caches.match(`${BASE_PATH}index.html`.replace(/\/+/g, '/')))
        .then((r) => r || caches.match(BASE_PATH))
        .then((r) => r || new Response('', { status: 503 }))
    );
    return;
  }

  const isStaticAsset = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
  const isHtml = event.request.destination === 'document';

  if (isStaticAsset && url.origin !== self.location.origin) {
    return;
  }

  if (isStaticAsset || isHtml) {
    event.respondWith(staleWhileRevalidate(event.request));
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
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const { title, body, icon, badge, data } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title || 'إشعار', {
        body: body || '',
        icon: icon || '/icon-192.png',
        badge: badge || '/icon-192.png',
        vibrate: [200, 100, 200],
        data: data || {},
        actions: [
          { action: 'open', title: 'فتح' },
          { action: 'close', title: 'إغلاق' },
        ],
      })
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || BASE_PATH;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});