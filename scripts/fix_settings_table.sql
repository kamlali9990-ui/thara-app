-- إضافة جدول الإعدادات (settings) للإصدار النهائي
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_select_all') THEN
    CREATE POLICY "settings_select_all" ON settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_insert_admin') THEN
    CREATE POLICY "settings_insert_admin" ON settings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_update_admin') THEN
    CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_delete_deny') THEN
    CREATE POLICY "settings_delete_deny" ON settings FOR DELETE USING (false);
  END IF;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE settings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- إضافة Indexes مفقودة للأداء
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_customer_email ON chat_messages(customer_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON chat_messages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_typing_events_order_id ON typing_events(order_id);

-- إضافة updated_at trigger للمنتجات (للترتيب حسب آخر تحديث)
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
