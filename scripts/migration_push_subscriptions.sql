-- push_subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up subscriptions by role
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON push_subscriptions(user_role);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email ON push_subscriptions(user_email);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can read all subscriptions (for sending push)
CREATE POLICY "push_subscriptions_select_staff" ON push_subscriptions
  FOR SELECT USING (public.is_staff());

-- Users can insert/update their own subscriptions
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- Users can delete their own subscriptions
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- Allow the service role (Edge Function) to manage all
CREATE POLICY "push_subscriptions_service_role_all" ON push_subscriptions
  USING (auth.role() = 'service_role');
