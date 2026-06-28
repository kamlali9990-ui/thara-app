import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*VITE_(\w+)\s*=\s*(.+)\s*$/);
    if (m) process.env['VITE_' + m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in .env');
  process.exit(1);
}

const BASE = process.env.VITE_BASE_URL || '/thara-app/';
const sb = createClient(supabaseUrl, supabaseKey);

const CAT_IMAGES = {
  'مواد غذائية': 'cat_canned.jpg',
  'منظفات': 'cat_vegetables.jpg',
  'إلكترونيات': 'الكترونيات.jpg',
  'أواني': 'اواني.jpg',
  'مكسرات وبهارات': 'cat_canned.jpg',
  'خضروات وفواكه': 'Getty.webp',
  'ألعاب': 'العاب.jpg',
  'مجموعة الأصناف': 'cat_dairy.jpg',
  'ملابس': 'ملابس.jpg',
  'مواد البناء': 'cat_hardware.jpg',
  'العطور': 'العطور.jpg'
};

const { data: products, error } = await sb
  .from('products')
  .select('id, name, category, image_url')
  .or('image_url.is.null,image_url.eq.');

if (error) { console.error('❌ Fetch error:', error.message); process.exit(1); }

let updated = 0;
for (const p of products || []) {
  const img = CAT_IMAGES[p.category];
  if (!img) continue;
  const url = BASE + img;
  const { error: updErr } = await sb.from('products').update({ image_url: url }).eq('id', p.id);
  if (updErr) { console.error(`❌ Failed to update #${p.id} (${p.name}):`, updErr.message); }
  else { updated++; }
}

console.log(`✅ Updated ${updated} products with category images (BASE: ${BASE})`);
