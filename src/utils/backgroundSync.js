export async function registerSync(tag) {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

export async function cacheFailedRequest(tag, url, options) {
  try {
    const cache = await caches.open(`thara-failed-${tag}`);
    const req = new Request(url, options);
    await cache.put(req, new Response(JSON.stringify({ body: options?.body })));
    await registerSync(tag);
  } catch {}
}

export async function isSyncSupported() {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}
