import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني مطلوب' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const emailLower = email.toLowerCase().trim();
    const authHeaders = {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    };

    // 1. Delete auth user if exists
    const findResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
    if (findResp.ok) {
      const findData = await findResp.json();
      const users: any[] = findData?.users || [];
      const user = users.find((u: any) => u.email?.toLowerCase().trim() === emailLower);
      if (user) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE', headers: authHeaders,
        });
      }
    }

    // 2. Anonymize customer data via update_customer_rpc (SECURITY DEFINER)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: rpcErr } = await supabase.rpc('update_customer_rpc', {
      p_email: emailLower,
      p_name: '(تم حذف)',
      p_phone: '',
      p_delivery_address: '',
      p_neighborhood: '',
      p_location: '',
      p_username: '',
      p_real_email: null,
    });
    if (rpcErr) console.error('[update_customer_rpc]', rpcErr.message);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
