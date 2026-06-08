-- Add archived column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);

-- RPC to archive an order (soft delete)
CREATE OR REPLACE FUNCTION public.archive_order_rpc(p_order_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_staff(ARRAY['admin', 'manager', 'employee']) THEN
    RAISE EXCEPTION 'Unauthorized: staff only';
  END IF;
  UPDATE orders SET archived = TRUE, archived_at = NOW()
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.archive_order_rpc TO authenticated;

-- RPC to restore an archived order
CREATE OR REPLACE FUNCTION public.restore_order_rpc(p_order_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_staff(ARRAY['admin', 'manager', 'employee']) THEN
    RAISE EXCEPTION 'Unauthorized: staff only';
  END IF;
  UPDATE orders SET archived = FALSE, archived_at = NULL
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.restore_order_rpc TO authenticated;

-- RPC to list archived orders
CREATE OR REPLACE FUNCTION public.list_archived_orders_rpc()
RETURNS JSON[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE results JSON[];
BEGIN
  IF NOT public.is_staff(ARRAY['admin', 'manager', 'employee']) THEN
    RAISE EXCEPTION 'Unauthorized: staff only';
  END IF;
  SELECT array_agg(row_to_json(orders)::JSON ORDER BY archived_at DESC NULLS LAST)
  INTO results
  FROM orders
  WHERE archived = TRUE;
  RETURN COALESCE(results, '{}');
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_archived_orders_rpc TO authenticated;
