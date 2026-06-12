CREATE OR REPLACE FUNCTION public.admin_cleanup_rpc(p_entities TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB;
  v_chat_count INT := 0;
  v_order_count INT := 0;
  v_customer_count INT := 0;
  v_staff_count INT := 0;
BEGIN
  IF 'chat_messages' = ANY(p_entities) THEN
    DELETE FROM chat_messages WHERE TRUE;
    GET DIAGNOSTICS v_chat_count = ROW_COUNT;
  END IF;

  IF 'orders' = ANY(p_entities) THEN
    DELETE FROM orders WHERE TRUE;
    GET DIAGNOSTICS v_order_count = ROW_COUNT;
  END IF;

  IF 'customers' = ANY(p_entities) THEN
    DELETE FROM customers WHERE TRUE;
    GET DIAGNOSTICS v_customer_count = ROW_COUNT;
  END IF;

  IF 'staff' = ANY(p_entities) THEN
    DELETE FROM staff WHERE TRUE;
    GET DIAGNOSTICS v_staff_count = ROW_COUNT;
  END IF;

  v_counts := jsonb_build_object(
    'chat_messages', v_chat_count,
    'orders', v_order_count,
    'customers', v_customer_count,
    'staff', v_staff_count
  );

  RETURN v_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cleanup_rpc FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_rpc TO authenticated, anon;
