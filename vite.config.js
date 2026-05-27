import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  return {
    base: isVercel ? '/' : (mode === 'production' ? '/thara-app/' : '/'),
    plugins: [react()],
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
