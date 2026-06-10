-- =====================================================
-- Push Notification Triggers
-- =====================================================
-- IMPORTANT: Replace '__WEBHOOK_SECRET__' with the actual
-- value of INTERNAL_WEBHOOK_SECRET from Supabase Dashboard
-- > Edge Functions > send-push > Environment Variables
-- =====================================================

DROP TRIGGER IF EXISTS trg_notify_new_order ON orders;
DROP TRIGGER IF EXISTS trg_notify_order_status ON orders;
DROP TRIGGER IF EXISTS trg_notify_new_offer ON products;
DROP TRIGGER IF EXISTS trg_notify_new_chat_message ON chat_messages;
DROP FUNCTION IF EXISTS public.notify_new_order();
DROP FUNCTION IF EXISTS public.notify_order_status();
DROP FUNCTION IF EXISTS public.notify_new_offer();
DROP FUNCTION IF EXISTS public.notify_new_chat_message();

-- =====================================================
-- 1. New Order → Staff (admin, manager, employee, driver)
-- =====================================================
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

-- =====================================================
-- 2. Order Status Change → Customer (push when app closed)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_url TEXT := 'https://oqwphazzuxmrxwbnothk.supabase.co/functions/v1/send-push';
  payload JSONB;
  status_message TEXT;
  status_title TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.customer_email IS NOT NULL THEN
    status_title := CASE NEW.status
      WHEN 'قيد التحضير' THEN 'طلبك قيد التحضير 🍳'
      WHEN 'جاهز للتوصيل' THEN 'طلبك جاهز 🚀'
      WHEN 'في الطريق' THEN 'الكابتن في الطريق 🏍️'
      WHEN 'مكتمل' THEN 'تم التوصيل بنجاح ✅'
      WHEN 'ملغي' THEN 'تم إلغاء الطلب'
      ELSE 'تحديث حالة الطلب'
    END;
    status_message := CASE NEW.status
      WHEN 'قيد التحضير' THEN 'تم استلام طلبك وجاري تجهيزه'
      WHEN 'جاهز للتوصيل' THEN 'طلبك جاهز بانتظار الكابتن'
      WHEN 'في الطريق' THEN CASE WHEN NEW.estimated_delivery IS NOT NULL
        THEN 'الكابتن في الطريق — الوصول خلال ' || NEW.estimated_delivery::TEXT || ' دقيقة'
        ELSE 'الكابتن في الطريق إليك'
      END
      WHEN 'مكتمل' THEN 'شكراً لتسوقك مع أسواق ثراء الشرق ون!'
      WHEN 'ملغي' THEN 'تم إلغاء الطلب. للاستفسار تواصل مع الدعم'
      ELSE 'تم تحديث طلبك إلى: ' || NEW.status
    END;
    payload := jsonb_build_object(
      'title', status_title,
      'body', status_message,
      'targetEmail', NEW.customer_email,
      'url', '/orders'
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

-- =====================================================
-- 3. New Offer → All Customers
-- =====================================================
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
      'title', '🔥 عرض جديد في أسواق ثراء الشرق ون',
      'body', 'اطلع على ' || COALESCE(NEW.name, 'العرض الجديد') || ' الآن!',
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

-- =====================================================
-- 4. New Chat Message → Recipient
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_url TEXT := 'https://oqwphazzuxmrxwbnothk.supabase.co/functions/v1/send-push';
  payload JSONB;
  recipient_role TEXT;
  recipient_email TEXT;
  sender_label TEXT;
BEGIN
  IF NEW.sender = 'customer' THEN
    -- Message from customer → notify all staff
    payload := jsonb_build_object(
      'title', '💬 رسالة من عميل',
      'body', NEW.text,
      'targetRole', 'staff',
      'url', '/admin'
    );
  ELSE
    -- Message from admin/driver → notify the specific customer
    sender_label := CASE WHEN NEW.sender = 'driver' THEN 'الكابتن' ELSE 'الدعم الفني' END;
    payload := jsonb_build_object(
      'title', '💬 ' || sender_label || ' — أسواق ثراء الشرق ون',
      'body', NEW.text,
      'targetEmail', NEW.customer_email,
      'url', '/'
    );
  END IF;
  IF payload IS NOT NULL THEN
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

-- =====================================================
-- Register Triggers
-- =====================================================
CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();

CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_status();

CREATE TRIGGER trg_notify_new_offer
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_offer();

CREATE TRIGGER trg_notify_new_chat_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_message();
