import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const { email, newPassword } = await req.json();
    if (!email || !newPassword) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: userData, error: lookupError } = await supabase.auth.admin.getUserByEmail(email);
    if (lookupError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'المستخدم غير موجود' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword }
    );
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, message: 'تم تغيير كلمة المرور بنجاح' }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
