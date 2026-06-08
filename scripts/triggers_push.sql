DROP TRIGGER IF EXISTS trg_notify_new_order ON orders;
DROP TRIGGER IF EXISTS trg_notify_new_offer ON products;
DROP FUNCTION IF EXISTS public.notify_new_order();
DROP FUNCTION IF EXISTS public.notify_new_offer();

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_url TEXT := 'https://oqwphazzuxmrxwbnothk.supabase.co/functions/v1/send-push';
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'title', 'طلب جديد',
    'body', 'طلب رقم #' || substring(NEW.id::TEXT, GREATEST(length(NEW.id::TEXT) - 5, 1), 6) || ' بقيمة ' || NEW.total::TEXT || ' ر.س',
    'targetRole', 'staff',
    'url', '/admin'
  );
  PERFORM net.http_post(
    url := func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    ),
    body := payload
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_url TEXT := 'https://oqwphazzuxmrxwbnothk.supabase.co/functions/v1/send-push';
  payload JSONB;
BEGIN
  IF (OLD.is_offer IS DISTINCT FROM NEW.is_offer) AND NEW.is_offer = true THEN
    payload := jsonb_build_object(
      'title', 'عرض جديد',
      'body', 'تم إضافة عرض جديد: ' || COALESCE(NEW.name, 'منتج') || '!',
      'targetRole', 'customers',
      'url', '/'
    );
    PERFORM net.http_post(
      url := func_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', '__WEBHOOK_SECRET__'
      ),
      body := payload
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();

CREATE TRIGGER trg_notify_new_offer
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_offer();
