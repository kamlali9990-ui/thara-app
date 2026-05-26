import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { products } = JSON.parse(readFileSync(join(root, 'src', 'data', 'products-data.json'), 'utf-8'));

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    // format to 2 decimal places for currency
    return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

const rows = products.map(p => {
  const name = sqlVal(p.name);
  const category = sqlVal(p.category);
  const price = sqlVal(p.price);
  const offerPrice = p.isOffer && p.offerPrice != null ? sqlVal(p.offerPrice) : 'NULL';
  const isOffer = sqlVal(!!p.isOffer);
  const imageUrl = sqlVal(p.imageUrl);
  const stockQty = sqlVal(p.stock_quantity ?? 50);
  const unit = sqlVal(p.unit ?? 'حبة');
  return `  (${name}, ${category}, ${price}, ${offerPrice}, ${isOffer}, ${imageUrl}, ${stockQty}, ${unit})`;
});

const insertBlock = `INSERT INTO products (name, category, price, offer_price, is_offer, image_url, stock_quantity, unit) VALUES\n${rows.join(',\n')};`;

// Read schema.sql and replace between markers
const schemaPath = join(root, 'src', 'supabase', 'schema.sql');
let schema = readFileSync(schemaPath, 'utf-8');

const startMarker = '-- @@SEED_START@@';
const endMarker = '/* @@SEED_END@@ */';

const startIdx = schema.indexOf(startMarker);
const endIdx = schema.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('ERROR: Could not find @@SEED_START@@ / @@SEED_END@@ markers in schema.sql');
  process.exit(1);
}

const before = schema.slice(0, startIdx + startMarker.length);
const after = schema.slice(endIdx);

schema = `${before}\n${insertBlock}\n${after}`;

writeFileSync(schemaPath, schema, 'utf-8');
console.log(`✅ Updated schema.sql with ${products.length} products (source: src/data/products-data.json)`);
