import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_TIMEOUT = 20000;

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

/**
 * Custom fetch with timeout — applies to ALL Supabase HTTP calls
 * (REST, Auth). Realtime WebSocket connections are unaffected.
 */
const TIMEOUT_ABORT = 'The request was aborted due to timeout';

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error(TIMEOUT_ABORT);
      }
      throw err;
    })
    .finally(() => clearTimeout(timeoutId));
}

export { TIMEOUT_ABORT };

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      storageKey: resolveAuthStorageKey(),
    },
    global: {
      fetch: fetchWithTimeout,
    }
  }
);
