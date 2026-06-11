-- تقييد 3 دوال غير مستخدمة من anon إلى authenticated فقط
-- هذه الدوال بقايا من تدفقات قديمة ولم تعد تُستدعى من التطبيق

REVOKE EXECUTE ON FUNCTION public.confirm_email_rpc FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_email_rpc FROM public;

REVOKE EXECUTE ON FUNCTION auto_create_and_signin_rpc FROM anon;
REVOKE EXECUTE ON FUNCTION auto_create_and_signin_rpc FROM public;

REVOKE EXECUTE ON FUNCTION public.verify_otp FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_otp FROM public;
