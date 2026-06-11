import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const CATEGORY_MAP = {
  'مواد غذايه': 'مواد غذائية',
  'مواد غذائية': 'مواد غذائية',
  'حلويات': 'مواد غذائية',
  'منظفات': 'منظفات',
  'العاب': 'ألعاب',
  'مكسرات وبهارات': 'مكسرات وبهارات',
  'اواني': 'أواني',
  'أواني': 'أواني',
  'خضروات و فواكه': 'خضروات وفواكه',
  'خضروات وفواكه': 'خضروات وفواكه',
  'اكترونيات': 'إلكترونيات',
  'إلكترونيات': 'إلكترونيات',
  'مجموعة الاصناف': 'مجموعة الأصناف',
  'مجموعة الأصناف': 'مجموعة الأصناف',
  'ملابس': 'ملابس',
  'عناية وعطور': 'مجموعة الأصناف',
  'ادوات مدرسية': 'مجموعة الأصناف',
  'مواد البناء': 'مواد البناء',
};

const UNIT_MAP = {
  'مواد غذائية': 'حبة',
  'منظفات': 'زجاجة',
  'ألعاب': 'حبة',
  'مكسرات وبهارات': 'علبة',
  'أواني': 'حبة',
  'خضروات وفواكه': 'كجم',
  'إلكترونيات': 'حبة',
  'مجموعة الأصناف': 'حبة',
  'ملابس': 'حبة',
  'مواد البناء': 'حبة',
};

function normalizeName(name) {
  return name.replace(/\s+/g, ' ').trim();
}

function cleanPrice(price) {
  const n = parseFloat(price);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function cleanStock(qty) {
  return Math.max(0, parseInt(qty) || 0);
}

function getUnit(category) {
  return UNIT_MAP[category] || 'حبة';
}

async function main() {
  // 1. Read xlsx
  const wb = XLSX.readFile(resolve(root, 'data.xlsx'));
  const ws = wb.Sheets['List_table'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 2. Extract products
  const products = [];
  const seenCategories = new Set();
  let idCounter = 1;

  for (let i = 5; i < rows.length; i++) {
    const [name, price, qty, category] = rows[i];
    const productName = normalizeName(String(name || ''));
    if (!productName) continue;

    const rawCategory = String(category || '').trim();
    const appCategory = CATEGORY_MAP[rawCategory];
    if (!appCategory) continue;

    seenCategories.add(appCategory);

    products.push({
      id: String(idCounter++),
      name: productName,
      category: appCategory,
      price: cleanPrice(price),
      stock_quantity: cleanStock(qty),
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80',
      unit: getUnit(appCategory),
    });
  }

  console.log(`Extracted ${products.length} products from xlsx`);

  // 3. Build categories
  const sortedCats = Array.from(seenCategories).sort((a, b) => a.localeCompare(b, 'ar'));
  const categories = ['الكل', 'العروض', 'بحث سريع', ...sortedCats];
  console.log(`Categories (${sortedCats.length}): ${sortedCats.join(', ')}`);

  // 4. Write products-data.json
  const jsonPath = resolve(root, 'src/data/products-data.json');
  writeFileSync(jsonPath, JSON.stringify({ products, categories }, null, 2), 'utf-8');
  console.log('✓ Updated src/data/products-data.json');

  // 5. Sync to Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠ No Supabase env vars found. Local JSON file updated only.');
    console.log('To sync to Supabase, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return;
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  console.log('Connecting to Supabase...');

  // Delete all existing products
  console.log('Deleting all existing products from Supabase...');
  const { error: delErr, count } = await sb.from('products').delete().neq('id', '0').select('count', { count: 'exact', head: true });
  if (delErr) {
    console.error('Delete error:', delErr.message);
    console.log('Will try to insert anyway...');
  } else {
    console.log('✓ All existing products deleted.');
  }

  // Bulk insert
  console.log(`Inserting ${products.length} products into Supabase...`);
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE).map(p => ({
      name: p.name,
      category: p.category,
      price: p.price,
      stock_quantity: p.stock_quantity,
      image_url: p.imageUrl,
      unit: p.unit,
    }));
    const { error: insErr } = await sb.from('products').insert(batch);
    if (insErr) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, insErr.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted}/${products.length}`);
    }
  }
  console.log(`\n✓ Done. ${inserted} products synced to Supabase.`);
}

main().catch(console.error);
