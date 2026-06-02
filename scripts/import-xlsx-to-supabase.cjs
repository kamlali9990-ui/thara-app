const XLSX = require('xlsx');
const https = require('https');

const PAT = 'YOUR_SUPABASE_ACCESS_TOKEN';
const PROJECT_REF = 'YOUR_PROJECT_REF';
const CHUNK_SIZE = 500;

const CAT_MAP = {
  'مواد غذايه': 'مواد غذائية',
  'اكترونيات': 'إلكترونيات',
  'اواني': 'أواني',
  'خضروات و فواكه': 'خضروات وفواكه',
  'مواد البناء': 'مواد البناء',
  'مجموعه الاصناف': 'مجموعة الأصناف',
  'العاب': 'ألعاب'
};

const VALID_CATS = ['مواد غذائية','منظفات','إلكترونيات','أواني','مكسرات وبهارات','خضروات وفواكه','ألعاب','مجموعة الأصناف','ملابس','مواد البناء'];

function mapCategory(cat) {
  const c = String(cat || '').trim();
  if (VALID_CATS.includes(c)) return c;
  return CAT_MAP[c] || c;
}

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + PROJECT_REF + '/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(res.statusCode + ': ' + d));
        else resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('Reading data.xlsx...');
  const wb = XLSX.readFile('data.xlsx');
  const ws = wb.Sheets['List_table'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row
  let start = -1;
  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const row = raw[i];
    if (row[0] === 'م' || String(row[1] || '').includes('الصنف')) { start = i; break; }
  }
  if (start === -1) start = 11;

  const rows = [];
  for (let i = start + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r[1] || String(r[1]).trim() === '' || String(r[1]) === 'الإجمالي') continue;
    rows.push({
      name: String(r[1] || '').trim(),
      unit: String(r[2] || 'حبة').trim(),
      stock_quantity: parseInt(String(r[3] || '0').replace(/,/g, ''), 10) || 0,
      price: parseFloat(String(r[4] || '0').replace(/,/g, '')) || 0,
      category: mapCategory(r[7] || '')
    });
  }

  console.log('Total items to import:', rows.length);

  // Truncate existing fake products
  console.log('Deleting old products...');
  await runSql('DELETE FROM products');
  await runSql("ALTER SEQUENCE products_id_seq RESTART WITH 1");
  console.log('Old products deleted.');

  // Import in chunks
  let imported = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const values = chunk.map(r => {
      const name = r.name.replace(/'/g, "''");
      const cat = r.category.replace(/'/g, "''");
      const unit = r.unit.replace(/'/g, "''");
      return `('${name}', '${cat}', ${r.price}, ${r.stock_quantity}, '${unit}')`;
    }).join(',\n');

    const sql = `INSERT INTO products (name, category, price, stock_quantity, unit) VALUES\n${values};`;
    await runSql(sql);
    imported += chunk.length;
    console.log(`Imported ${imported}/${rows.length}`);
  }

  console.log('Done! Total imported:', imported);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
