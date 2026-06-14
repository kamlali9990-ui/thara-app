-- Migration: Create settings table and performance indexes
-- Order: Runs before 20260611_0021_site_stats.sql

-- 1. Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for settings table
DROP POLICY IF EXISTS "settings_select_all" ON settings;
CREATE POLICY "settings_select_all" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "settings_delete_deny" ON settings;
CREATE POLICY "settings_delete_deny" ON settings FOR DELETE USING (false);

-- 3. Add settings to realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_customer_email ON chat_messages(customer_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON chat_messages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_typing_events_order_id ON typing_events(order_id);

-- 5. Add updated_at column to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
