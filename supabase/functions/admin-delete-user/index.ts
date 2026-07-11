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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let authDeleted = false;

    // 1. Try to find and delete auth user
    const findResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
    });
    if (findResp.ok) {
      const findData = await findResp.json();
      const users: any[] = findData?.users || [];
      const user = users.find((u: any) => u.email?.toLowerCase().trim() === emailLower);
      if (user) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (!delErr) authDeleted = true;
      }
    }

    // 2. Delete customer record (may or may not exist)
    await supabase.from('customers').delete().eq('email', emailLower);

    if (!authDeleted) {
      // Only customer record was deleted (or neither existed)
      return new Response(JSON.stringify({ success: true, message: 'تم حذف بيانات العميل' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'تم حذف المستخدم بنجاح' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
