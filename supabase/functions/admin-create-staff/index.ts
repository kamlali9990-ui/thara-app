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
    const { email, name, role, password } = await req.json();
    if (!email || !name || !role || !password) {
      return new Response(JSON.stringify({ error: 'الحقول مطلوبة: email, name, role, password' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const emailLower = email.toLowerCase().trim();
    const authHeaders = {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    };

    // 1. Create or update auth user
    const usersResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
    const usersData = await usersResp.json();
    const users: any[] = usersData?.users || [];
    const found = users.find((u: any) => u.email?.toLowerCase().trim() === emailLower);

    if (found) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${found.id}/update`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ password }),
      });
    } else {
      const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ email: emailLower, password, email_confirm: true }),
      });
      if (!createResp.ok) throw new Error(`فشل إنشاء المستخدم: ${await createResp.text()}`);
    }

    // 2. Upsert staff record: first try update, then insert (to avoid sequence)
    const checkResp = await fetch(
      `${SUPABASE_URL}/rest/v1/staff?email=eq.${encodeURIComponent(emailLower)}&select=id`,
      { headers: authHeaders }
    );
    if (checkResp.ok) {
      const existing = await checkResp.json();
      if (existing && existing.length > 0) {
        // UPDATE existing
        const updResp = await fetch(
          `${SUPABASE_URL}/rest/v1/staff?email=eq.${encodeURIComponent(emailLower)}`,
          {
            method: 'PATCH', headers: authHeaders,
            body: JSON.stringify({ name, role, phone: null }),
          }
        );
        if (!updResp.ok && updResp.status !== 204) throw new Error(`فشل تحديث الموظف: ${await updResp.text()}`);
      } else {
        // INSERT with explicit id to avoid sequence
        const maxResp = await fetch(
          `${SUPABASE_URL}/rest/v1/staff?select=id&order=id.desc&limit=1`,
          { headers: authHeaders }
        );
        let nextId = 1;
        if (maxResp.ok) {
          const maxData = await maxResp.json();
          if (maxData && maxData.length > 0) nextId = maxData[0].id + 1;
        }
        const insResp = await fetch(`${SUPABASE_URL}/rest/v1/staff`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ id: nextId, email: emailLower, name, role, phone: null }),
        });
        if (!insResp.ok) throw new Error(`فشل إضافة الموظف: ${await insResp.text()}`);
      }
    } else {
      // Fallback: try upsert with explicit id
      const maxResp = await fetch(
        `${SUPABASE_URL}/rest/v1/staff?select=id&order=id.desc&limit=1`,
        { headers: authHeaders }
      );
      let nextId = 1;
      if (maxResp.ok) {
        const maxData = await maxResp.json();
        if (maxData && maxData.length > 0) nextId = maxData[0].id + 1;
      }
      const insResp = await fetch(`${SUPABASE_URL}/rest/v1/staff`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ id: nextId, email: emailLower, name, role, phone: null }),
      });
      if (!insResp.ok) throw new Error(`فشل إضافة الموظف: ${await insResp.text()}`);
    }

    return new Response(JSON.stringify({ success: true, email: emailLower, role }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
