import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const BUILD_ID = Date.now().toString(36);

function swVersionPlugin() {
  return {
    name: 'sw-version',
    closeBundle() {
      const swPath = resolve('dist', 'sw.js');
      try {
        const sw = readFileSync(swPath, 'utf-8');
        writeFileSync(swPath, sw.replace(/__BUILD_ID__/g, BUILD_ID));
      } catch {}
      const htmlPath = resolve('dist', 'index.html');
      try {
        const html = readFileSync(htmlPath, 'utf-8');
        writeFileSync(htmlPath, html.replace(/<\/head>/, `<meta name="build-id" content="${BUILD_ID}"></head>`));
      } catch {}
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  return {
    base: isVercel ? '/' : (mode === 'production' ? '/thara-app/' : '/'),
    plugins: [react(), swVersionPlugin()],

    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    build: {
      chunkSizeWarningLimit: 2200,
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
