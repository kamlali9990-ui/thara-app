import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '%c[Supabase] Missing credentials!',
    'color: red; font-weight: bold; font-size: 1.2rem'
  );
  console.info(
    '%cCreate a .env file with:\nVITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key',
    'color: #127443; font-weight: bold'
  );
}

function resolveAuthStorageKey() {
  if (typeof window === 'undefined') return 'thara-auth-store';
  const path = window.location.pathname || '';
  // Keep admin and storefront sessions isolated between tabs/routes.
  return path.includes('/admin') ? 'thara-auth-admin' : 'thara-auth-store';
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      storageKey: resolveAuthStorageKey(),
    }
  }
);
