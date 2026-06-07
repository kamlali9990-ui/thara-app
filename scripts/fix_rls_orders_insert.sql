DROP POLICY IF EXISTS "orders_insert_public" ON orders;
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (
    phone IS NOT NULL AND phone != ''
    AND location IS NOT NULL AND location != ''
  );
