import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@tharasharqone.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEBHOOK_SECRET = Deno.env.get('INTERNAL_WEBHOOK_SECRET') || '';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-webhook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const webhookSecret = req.headers.get('x-webhook-secret') || '';
  const authHeader = req.headers.get('Authorization') || '';

  // Allow internal calls (from DB triggers with webhook secret) OR authenticated client calls
  const isInternalCall = webhookSecret === WEBHOOK_SECRET && WEBHOOK_SECRET !== '';
  const isAuthenticated = authHeader.startsWith('Bearer ') && authHeader.length > 20;

  if (!isInternalCall && !isAuthenticated) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  try {
    const { title, body, icon, targetRole, url, targetEmail } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth');

    if (targetEmail) {
      query = query.eq('user_email', targetEmail);
    } else if (targetRole === 'staff') {
      query = query.in('user_role', ['admin', 'manager', 'employee', 'driver']);
    } else if (targetRole === 'admin') {
      query = query.in('user_role', ['admin', 'manager']);
    } else if (targetRole === 'drivers') {
      query = query.eq('user_role', 'driver');
    } else if (targetRole === 'customers') {
      query = query.eq('user_role', 'customer');
    } else if (targetRole) {
      query = query.eq('user_role', targetRole);
    }

    const { data: subs, error } = await query;
    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const payload = JSON.stringify({
      title, body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/' },
    });

    let sent = 0;
    const expired = [];

    for (const sub of subs) {
      try {
        const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
        await webpush.sendNotification(pushSub, payload, { TTL: 86400 });
        sent++;
      } catch (err) {
        if (err.statusCode === 410) expired.push(sub.endpoint);
      }
    }

    if (expired.length > 0) {
      for (const ep of expired) {
        try { await supabase.from('push_subscriptions').delete().eq('endpoint', ep); } catch {}
      }
    }

    return new Response(JSON.stringify({ sent, total: subs.length, expired: expired.length }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
