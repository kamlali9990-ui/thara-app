import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  return {
    base: isVercel ? '/' : (mode === 'production' ? '/thara-app/' : '/'),
    plugins: [react()],

    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_MAPTILER_KEY': JSON.stringify(env.VITE_MAPTILER_KEY || ''),
      'import.meta.env.VITE_ADMIN_EMAIL': JSON.stringify(env.VITE_ADMIN_EMAIL || ''),
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
            leaflet: ['leaflet'],
            vendor: ['react', 'react-dom', 'react-router-dom']
          }
        }
      }
    }
  };
})
