process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
(async () => {
  const c = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com', port: 5432, database: 'postgres',
    user: 'YOUR_SUPABASE_USER', password: 'YOUR_SUPABASE_PASSWORD',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  console.log('CONNECTED');

  // Fix 1: Grant proper permissions on auth schema
  console.log('\n=== Fixing auth schema permissions ===');
  await c.query('GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated, service_role');
  console.log('GRANT USAGE ON SCHEMA auth OK');

  // Grant on all existing tables in auth schema
  await c.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO authenticator');
  await c.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin');
  console.log('GRANT ON auth tables OK');

  // Grant on sequences
  await c.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO authenticator');
  await c.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin');
  console.log('GRANT ON auth sequences OK');

  // Fix 2: Apply our migration SQL
  console.log('\n=== Applying migration ===');
  await c.query(`
    CREATE OR REPLACE FUNCTION public.create_customer_auth_rpc(p_email TEXT, p_password TEXT)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, extensions
    AS \$\$
    DECLARE
      v_user_id UUID;
      identity_id UUID;
      clean_email TEXT;
      pw_hash TEXT;
    BEGIN
      clean_email := lower(trim(p_email));
      IF clean_email = '' OR position('@' in clean_email) = 0 THEN
        RAISE EXCEPTION 'Invalid email';
      END IF;
      IF p_password IS NULL OR length(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
      END IF;

      SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
      IF v_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'User already registered';
      END IF;

      pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
      v_user_id := extensions.gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_sent_at, confirmation_token,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        is_sso_user, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
        now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
        now(), now(), false, false
      );

      SELECT i.id INTO identity_id
      FROM auth.identities i
      WHERE i.user_id = v_user_id AND i.provider = 'email'
      LIMIT 1;

      IF identity_id IS NULL THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (
          extensions.gen_random_uuid(),
          v_user_id,
          json_build_object('sub', v_user_id::TEXT, 'email', clean_email),
          'email',
          clean_email,
          now(), now(), now()
        );
      END IF;

      RETURN json_build_object('id', v_user_id, 'email', clean_email);
    END;
    \$\$;
  `);
  console.log('create_customer_auth_rpc OK');

  await c.query(`
    CREATE OR REPLACE FUNCTION public.confirm_auth_user(p_email TEXT, p_password TEXT DEFAULT '123456')
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, extensions
    AS \$\$
    DECLARE
      v_uid UUID;
      pw_hash TEXT;
      iid UUID;
    BEGIN
      pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
      SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
      IF v_uid IS NULL THEN
        v_uid := extensions.gen_random_uuid();
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, confirmation_sent_at, confirmation_token,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          is_sso_user, is_anonymous
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', p_email, pw_hash,
          now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
          now(), now(), false, false
        );
      ELSE
        UPDATE auth.users SET
          instance_id = '00000000-0000-0000-0000-000000000000',
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          encrypted_password = pw_hash,
          confirmation_token = '',
          updated_at = now()
        WHERE id = v_uid;
      END IF;
      SELECT id INTO iid FROM auth.identities
      WHERE user_id = v_uid AND provider = 'email' LIMIT 1;
      IF iid IS NULL THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (extensions.gen_random_uuid(), v_uid, json_build_object('sub', v_uid::TEXT, 'email', p_email), 'email', p_email, now(), now(), now());
      ELSE
        UPDATE auth.identities SET identity_data = json_build_object('sub', v_uid::TEXT, 'email', p_email)
        WHERE id = iid AND (identity_data ->> 'email_verified') IS NOT NULL;
      END IF;
      RETURN json_build_object('id', v_uid, 'email', p_email);
    END;
    \$\$;
  `);
  console.log('confirm_auth_user OK');

  // Revoke anon, grant authenticated
  await c.query('REVOKE EXECUTE ON FUNCTION public.confirm_auth_user FROM anon');
  await c.query('GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO authenticated');
  console.log('confirm_auth_user grants OK');

  // Fix staff functions
  await c.query(`
    CREATE OR REPLACE FUNCTION public.ensure_staff_auth_user(p_email TEXT, p_password TEXT)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, extensions
    AS \$\$
    DECLARE
      staff_exists BOOLEAN;
      result JSON;
    BEGIN
      SELECT EXISTS(SELECT 1 FROM staff WHERE lower(email) = lower(p_email)) INTO staff_exists;
      IF NOT staff_exists THEN
        RETURN json_build_object('staff_exists', false, 'fixed', false);
      END IF;
      result := public.confirm_auth_user(p_email, p_password);
      RETURN json_build_object('staff_exists', true, 'fixed', true, 'user', result);
    END;
    \$\$;
  `);
  console.log('ensure_staff_auth_user OK');

  await c.query('GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO authenticated');
  console.log('ensure_staff_auth_user grants OK');

  // Fix: assign_driver_to_order
  await c.query(`
    CREATE OR REPLACE FUNCTION public.assign_driver_to_order(
      p_order_id BIGINT,
      p_driver_id BIGINT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS \$\$
    DECLARE
      result JSON;
      driver_role TEXT;
    BEGIN
      IF NOT public.is_staff(ARRAY['admin', 'manager']) THEN
        RAISE EXCEPTION 'Unauthorized: admin/manager only';
      END IF;
      IF p_driver_id IS NOT NULL THEN
        SELECT role INTO driver_role FROM staff WHERE id = p_driver_id;
        IF driver_role IS NULL OR driver_role != 'driver' THEN
          RAISE EXCEPTION 'Invalid driver id';
        END IF;
      END IF;
      UPDATE orders SET assigned_driver_id = p_driver_id WHERE id = p_order_id
      RETURNING row_to_json(orders)::JSON INTO result;
      RETURN result;
    END;
    \$\$;
  `);
  console.log('assign_driver_to_order OK');

  // Fix: update_staff_rpc
  await c.query(`
    CREATE OR REPLACE FUNCTION public.update_staff_rpc(
      p_id BIGINT, p_email TEXT, p_name TEXT, p_role TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS \$\$
    DECLARE
      result JSON;
      old_email TEXT;
    BEGIN
      IF NOT public.is_staff(ARRAY['admin']) THEN
        RAISE EXCEPTION 'Unauthorized: admin only';
      END IF;
      SELECT email INTO old_email FROM staff WHERE id = p_id;
      UPDATE staff
      SET email = p_email, name = p_name, role = p_role
      WHERE id = p_id
      RETURNING row_to_json(staff)::JSON INTO result;
      IF old_email IS DISTINCT FROM p_email THEN
        UPDATE auth.users
        SET email = p_email, updated_at = now()
        WHERE lower(email) = lower(old_email);
      END IF;
      RETURN result;
    END;
    \$\$;
  `);
  console.log('update_staff_rpc OK');

  // Fix: create_staff_rpc
  await c.query(`
    CREATE OR REPLACE FUNCTION public.create_staff_rpc(
      p_email TEXT, p_name TEXT, p_role TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS \$\$
    DECLARE
      result JSON;
    BEGIN
      IF NOT public.is_staff(ARRAY['admin']) THEN
        RAISE EXCEPTION 'Unauthorized: admin only';
      END IF;
      INSERT INTO staff (email, name, role)
      VALUES (lower(trim(p_email)), p_name, p_role)
      RETURNING row_to_json(staff)::JSON INTO result;
      RETURN result;
    END;
    \$\$;
  `);
  console.log('create_staff_rpc OK');

  // Grant list_customers_rpc
  await c.query('GRANT EXECUTE ON FUNCTION public.list_customers_rpc TO authenticated');
  console.log('list_customers_rpc grant OK');

  // Fix 3: Grant RLS access to anon for products, orders, chat_messages
  console.log('\n=== Fixing RLS grants ===');
  try {
    await c.query('GRANT SELECT ON TABLE public.products TO anon');
    console.log('GRANT SELECT products TO anon OK');
  } catch(e) { console.log('products grant error:', e.message.substring(0,100)); }
  try {
    await c.query('GRANT SELECT ON TABLE public.orders TO anon');
    console.log('GRANT SELECT orders TO anon OK');
  } catch(e) { console.log('orders grant error:', e.message.substring(0,100)); }
  try {
    await c.query('GRANT SELECT ON TABLE public.chat_messages TO anon');
    console.log('GRANT SELECT chat_messages TO anon OK');
  } catch(e) { console.log('chat_messages grant error:', e.message.substring(0,100)); }
  try {
    await c.query('GRANT SELECT ON TABLE public.staff TO authenticated');
    console.log('GRANT SELECT staff TO authenticated OK');
  } catch(e) { console.log('staff grant error:', e.message.substring(0,100)); }

  console.log('\n=== ALL MIGRATIONS APPLIED ===');
  await c.end();
  process.exit(0);
})().catch(e => { console.log('FATAL:', e.message.substring(0,300)); process.exit(1); });
