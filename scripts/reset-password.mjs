// محاولة إعادة تعيين كلمة المرور عبر RPC ensure_staff_auth_user
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oqwphazzuxmrxwbnothk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NuFgM9QjjZiKxPl9zG_skw_v2bYekel';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetPassword() {
  console.log('1. محاولة استدعاء ensure_staff_auth_user...');
  const { data: fixResult, error: rpcError } = await supabase.rpc('ensure_staff_auth_user', {
    p_identifier: 'yaser.haroon79@gmail.com',
    p_password: '123456'
  });

  if (rpcError) {
    console.error('خطأ في RPC:', rpcError.message);
    console.log('قد تكون صلاحيات anon غير مفعلة. جرب تشغيل scripts/reset-admin-password.sql في SQL Editor');
    return;
  }

  console.log('نتيجة RPC:', JSON.stringify(fixResult, null, 2));

  if (fixResult?.fixed) {
    console.log('\n2. تم تحديث كلمة المرور! جرب تسجيل الدخول بـ:');
    console.log('   البريد: yaser.haroon79@gmail.com');
    console.log('   كلمة المرور: 123456');

    console.log('\n3. محاولة تسجيل الدخول...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'yaser.haroon79@gmail.com',
      password: '123456'
    });

    if (error) {
      console.error('فشل تسجيل الدخول:', error.message);
    } else {
      console.log('✅ تم تسجيل الدخول بنجاح!');
      console.log('المستخدم:', data.user.email);
    }
  } else {
    console.log('لم يتم العثور على الموظف في قاعدة البيانات');
  }
}

resetPassword().catch(console.error);
