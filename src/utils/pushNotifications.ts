const VAPID_PUBLIC_KEY = 'BC_mJhzpq_PM9oCBQ7XEmG0O97W9AKqei0CmUnqNj18E0kxC5laE7SrDshXDLdmrMOJ0pZuEj_3WzG58QJdKzxY';

async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = (window as any).__swRegistration || await navigator.serviceWorker.ready;
  return reg;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

export async function subscribePush(userEmail: string, userRole: string): Promise<PushSubscription | null> {
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
      p256dh: subJson.keys!.p256dh,
      auth: subJson.keys!.auth,
      user_email: userEmail,
      user_role: userRole,
    };

    const { supabase } = await import('../supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Push subscribe skipped: no active session');
      return null;
    }
    const { error } = await supabase.from('push_subscriptions').upsert(payload, {
      onConflict: 'endpoint',
    });
    if (error) {
      if (error.code === '42501' || error.message?.includes('401') || error.message?.includes('JWT')) {
        console.warn('Push subscribe failed: auth error (session may have expired)');
        return null;
      }
      throw error;
    }

    return sub;
  } catch (err: any) {
    if (Notification.permission === 'denied') return null;
    const msg = err?.message || err;
    if (msg?.includes('401') || msg?.includes('JWT') || msg?.includes('unauthorized')) {
      console.warn('Push subscribe failed: auth error');
      return null;
    }
    console.warn('Push subscribe failed:', msg);
    return null;
  }
}

export async function unsubscribePush(_userEmail: string): Promise<void> {
  try {
    const reg = await getSWRegistration();
    let endpoint: string | null = null;
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.toJSON().endpoint!;
        await sub.unsubscribe();
      }
    }

    if (endpoint) {
    const { supabase } = await import('../supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Push unsubscribe skipped: no active session');
        return;
      }
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch (err: any) {
    const msg = err?.message || err;
    if (msg?.includes('401') || msg?.includes('JWT') || msg?.includes('unauthorized')) {
      console.warn('Push unsubscribe failed: auth error');
      return;
    }
    console.warn('Push unsubscribe failed:', msg);
  }
}

export async function getPushSubscriptionStatus(): Promise<PushSubscription | null> {
  try {
    const reg = await getSWRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}
