-- =============================================
-- إعادة تعيين كلمة مرور المدير yaser.haroon79@gmail.com
-- شغّل هذا في: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new
-- =============================================

-- تغيير كلمة المرور مباشرة في auth.users
UPDATE auth.users
SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now(),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = ''
WHERE lower(email) = 'yaser.haroon79@gmail.com';

-- التأكد من وجود identity
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

-- تأكيد
SELECT email, 'تم التغيير بنجاح' AS result FROM auth.users WHERE lower(email) = 'yaser.haroon79@gmail.com';
