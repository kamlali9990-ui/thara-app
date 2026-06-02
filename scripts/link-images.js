const fs = require('fs');
const path = require('path');

const DOWNLOADED_DIR = 'E:\\صور\\صور_ال-products';
const PRODUCTS_JSON = 'E:\\TharaApp1\\src\\data\\products-data.json';
const OUTPUT_JSON = 'E:\\TharaApp1\\src\\data\\products-data.json';
const PUBLIC_DIR = 'E:\\TharaApp1\\public\\products';

// Normalize Arabic text for matching
function normalize(str) {
  return str
    .replace(/[ًٌٍَُِّْ]/g, '') // Remove tashkeel
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Main
async function linkImages() {
  console.log('Starting image linking...\n');

  // 1. Get list of downloaded folders
  if (!fs.existsSync(DOWNLOADED_DIR)) {
    console.error('ERROR: Downloaded images folder not found:', DOWNLOADED_DIR);
    return;
  }

  const downloadedFolders = fs.readdirSync(DOWNLOADED_DIR);
  console.log(`Found ${downloadedFolders.length} downloaded product folders.\n`);

  // 2. Load products JSON
  const productsData = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  console.log(`Loaded ${productsData.products.length} products from JSON.\n`);

  // 3. Create mapping: normalize(productName) -> folderName
  const folderMap = {};
  for (const folder of downloadedFolders) {
    // Folder format: "1 - Product Name"
    const parts = folder.split(' - ');
    if (parts.length >= 2) {
      const name = parts.slice(1).join(' - ').trim();
      folderMap[normalize(name)] = folder;
    }
  }

  // 4. Match and update
  let matched = 0;
  let notFound = 0;

  for (const product of productsData.products) {
    const normName = normalize(product.name);
    
    if (folderMap[normName]) {
      const folder = folderMap[normName];
      const folderPath = path.join(DOWNLOADED_DIR, folder);
      const files = fs.readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
      
      if (files.length > 0) {
        // Copy first image to public/products
        const sourceFile = path.join(folderPath, files[0]);
        const destFileName = `${product.id}_${files[0]}`;
        const destPath = path.join(PUBLIC_DIR, destFileName);
        
        fs.copyFileSync(sourceFile, destPath);
        
        // Update imageUrl
        product.imageUrl = `/products/${destFileName}`;
        matched++;
        console.log(`[MATCH] ${product.name} -> ${destFileName}`);
      }
    } else {
      notFound++;
      console.log(`[SKIP] ${product.name}`);
    }
  }

  // 5. Save updated JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(productsData, null, 2), 'utf8');

  console.log(`\n========== DONE ==========`);
  console.log(`Matched: ${matched}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Saved to: ${OUTPUT_JSON}`);
}

linkImages().catch(console.error);
