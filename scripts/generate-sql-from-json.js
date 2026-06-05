import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const data = JSON.parse(readFileSync(resolve(root, 'src/data/products-data.json'), 'utf-8'));
const products = data.products;

function esc(v) {
  return String(v ?? '').replace(/'/g, "''");
}

let sql = '-- Generated SQL: حذف وإضافة المنتجات من data.xlsx\n';
sql += '-- تاريخ التوليد: ' + new Date().toISOString().split('T')[0] + '\n\n';
sql += 'START TRANSACTION;\n\n';
sql += '-- 1. حذف جميع المنتجات الحالية\n';
sql += 'DELETE FROM products;\n';
sql += 'ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;\n\n';
sql += '-- 2. إضافة المنتجات الجديدة\n';

const BATCH = 500;
for (let i = 0; i < products.length; i += BATCH) {
  const batch = products.slice(i, i + BATCH);
  const lines = batch.map(p => {
    const name = esc(p.name);
    const cat = esc(p.category);
    const price = Number(p.price) || 0;
    const stock = Number(p.stock_quantity) || 0;
    const img = esc(p.imageUrl);
    const unit = esc(p.unit || 'حبة');
    return `('${name}', '${cat}', ${price}, ${stock}, '${img}', '${unit}')`;
  });
  sql += `INSERT INTO products (name, category, price, stock_quantity, image_url, unit) VALUES\n`;
  sql += lines.join(',\n');
  sql += ';\n\n';
}

sql += 'COMMIT;\n';
sql += '\n-- ✅ تم. عدد المنتجات: ' + products.length + '\n';

writeFileSync(resolve(root, 'scripts/sync-products.sql'), sql, 'utf-8');
console.log('✓ Generated scripts/sync-products.sql with ' + products.length + ' products');
