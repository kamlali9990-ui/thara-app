-- إصلاح صلاحية ensure_staff_auth_user
-- المشكلة: الميغريشن 0009 سحب صلاحية anon + public عن الدالة
-- لكن الكود يستخدمها كملجأ احتياطي قبل تسجيل الدخول (بدون session)
-- الحل: إعادة منح anon لأن الدالة تستخدم SECURITY DEFINER وهي آمنة

GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO anon;
