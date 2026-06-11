-- =============================================
-- إعادة تعيين كلمة مرور المدير yaser.haroon79@gmail.com
-- شغّل هذا الملف في: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new
-- =============================================

BEGIN;

-- 1. التأكد من أن دالة ensure_staff_auth_user متاحة للجميع (anon)
--    لأن التطبيق يستخدمها كملجأ قبل تسجيل الدخول (بدون session)
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO anon;

-- 2. تغيير كلمة مرور المدير مباشرة في auth.users
UPDATE auth.users
SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = ''
WHERE lower(email) = 'yaser.haroon79@gmail.com';

-- 3. التأكد من وجود سجل في جدول staff
INSERT INTO staff (email, name, role)
VALUES ('yaser.haroon79@gmail.com', 'مدير', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin', name = 'مدير';

-- 4. التحقق من وجود identity في auth.identities
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT
  extensions.gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::TEXT, 'email', email, 'email_verified', true, 'phone_verified', false),
  'email',
  id::TEXT,
  now(), now(), now()
FROM auth.users
WHERE lower(email) = 'yaser.haroon79@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = auth.users.id AND provider = 'email'
  );

COMMIT;

-- 5. تأكيد التغيير
SELECT email, role FROM staff WHERE lower(email) = 'yaser.haroon79@gmail.com';
