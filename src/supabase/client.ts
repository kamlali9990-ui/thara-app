import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
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

function resolveAuthStorageKey(): string {
  if (typeof window === 'undefined') return 'thara-auth-store';
  const path = window.location.pathname || '';
  return path.includes('/admin') ? 'thara-auth-admin' : 'thara-auth-store';
}

const TIMEOUT_ABORT = 'The request was aborted due to timeout';

function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
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
