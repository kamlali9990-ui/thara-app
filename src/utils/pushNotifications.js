const VAPID_PUBLIC_KEY = 'BMBdxfmSMtM_QjygEUCWMRp5d4eK0qwy7mPBi7mLw7tJocd8oVNHcBLPivcIPZnKrF5Bq9Nw8MkJ9o6v1SHjLCc';

async function getSWRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = window.__swRegistration || await navigator.serviceWorker.ready;
  return reg;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

export async function subscribePush(userEmail, userRole) {
  try {
    const reg = await getSWRegistration();
    if (!reg) return null;

    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = sub.toJSON();
    const payload = {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      user_email: userEmail,
      user_role: userRole,
    };

    const { supabase } = await import('../supabase/client.js');
    const { error } = await supabase.from('push_subscriptions').upsert(payload, {
      onConflict: 'endpoint',
    });
    if (error) throw error;

    return sub;
  } catch (err) {
    if (Notification.permission === 'denied') return null;
    console.warn('Push subscribe failed:', err?.message || err);
    return null;
  }
}

export async function unsubscribePush(userEmail) {
  try {
    const reg = await getSWRegistration();
    let endpoint = null;
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.toJSON().endpoint;
        await sub.unsubscribe();
      }
    }

    if (endpoint) {
      const { supabase } = await import('../supabase/client.js');
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch {}
}

export async function getPushSubscriptionStatus() {
  try {
    const reg = await getSWRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
