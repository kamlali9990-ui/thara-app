const fs = require('fs');
const path = require('path');

const DOWNLOADED_DIR = 'E:\\صور\\صور_المنتجات';
const PRODUCTS_JSON = 'E:\\TharaApp1\\src\\data\\products-data.json';
const PUBLIC_DIR = 'E:\\TharaApp1\\public\\products';

function sanitize(str) {
  return str.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

async function addNewProducts() {
  console.log('Adding new products with images...\n');

  // 1. Get downloaded folders
  if (!fs.existsSync(DOWNLOADED_DIR)) {
    console.error('ERROR: Folder not found:', DOWNLOADED_DIR);
    return;
  }

  const folders = fs.readdirSync(DOWNLOADED_DIR);
  console.log(`Found ${folders.length} downloaded folders.\n`);

  // 2. Load existing products
  const productsData = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  const existingCount = productsData.products.length;
  console.log(`Existing products: ${existingCount}\n`);

  // 3. Get next available ID
  let nextId = Math.max(...productsData.products.map(p => parseInt(p.id) || 0)) + 1;

  // 4. Process each folder
  let added = 0;
  for (const folder of folders) {
    // Parse folder: "3 - دجاج ارجنتي 900جرام"
    const parts = folder.split(' - ');
    if (parts.length < 2) continue;

    const serial = parts[0].trim();
    const productName = parts.slice(1).join(' - ').trim();

    // Get images in folder
    const folderPath = path.join(DOWNLOADED_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    if (files.length === 0) continue;

    // Copy first image to public
    const sourceFile = path.join(folderPath, files[0]);
    const ext = path.extname(files[0]);
    const destFileName = `${nextId}${ext}`;
    const destPath = path.join(PUBLIC_DIR, destFileName);
    
    fs.copyFileSync(sourceFile, destPath);

    // Add new product
    const newProduct = {
      id: nextId.toString(),
      name: productName,
      category: 'منتجات متنوعة',
      price: 0,
      stock_quantity: 10,
      imageUrl: `/products/${destFileName}`,
      unit: 'حبة'
    };

    productsData.products.push(newProduct);
    console.log(`[ADDED] #${nextId}: ${productName} → ${destFileName}`);
    
    nextId++;
    added++;
  }

  // 5. Save updated JSON
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(productsData, null, 2), 'utf8');

  console.log(`\n========== DONE ==========`);
  console.log(`Added: ${added} new products`);
  console.log(`Total products now: ${productsData.products.length}`);
  console.log(`Images saved to: ${PUBLIC_DIR}`);
}

addNewProducts().catch(console.error);
