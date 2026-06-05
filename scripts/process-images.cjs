const https = require('https');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

// --- إعدادات التوكنز والاتصال ---
const SUPABASE_PAT = process.env.SUPABASE_ACCESS_TOKEN || '';
const SUPABASE_PROJECT_REF = process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0] : '';
const SERPER_API_KEY = process.env.VITE_SERPER_API_KEY || '';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '', 
    api_key: process.env.CLOUDINARY_API_KEY || '', 
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CACHE_FILE = path.join(__dirname, 'search-cache.json');

// --- دوال المساعدة للـ Supabase API ---
function runSql(sql) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + SUPABASE_PROJECT_REF + '/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_PAT,
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

const BLOCKED_DOMAINS = [
  'facebook.com',
  'fbsbx.com',
  'fbcdn.net',
  'instagram.com',
  'cdninstagram.com',
  'pinterest.com',
  'pinimg.com',
  'twitter.com',
  'twimg.com',
  'tiktok.com'
];

function isBlockedUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const s = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => s.includes(domain));
}

// --- دوال المساعدة لـ Serper.dev ---
function searchImage(query) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ q: query, num: 10, hl: "ar", gl: "sa" });
    const options = {
      hostname: 'google.serper.dev',
      path: '/images',
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(res.statusCode + ': ' + d));
        else {
          try {
            const data = JSON.parse(d);
            if (data.images && data.images.length > 0) {
              const validImage = data.images.find(img => img.imageUrl && !isBlockedUrl(img.imageUrl));
              resolve(validImage ? validImage.imageUrl : null);
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// --- الدالة الرئيسية ---
async function main() {
  console.log('🔄 جلب المنتجات من قاعدة البيانات...');
  const productsRaw = await runSql('SELECT id, name, image_url FROM products ORDER BY id ASC');
  const products = productsRaw || [];
  console.log(`تم العثور على ${products.length} منتج.`);

  // تحميل الـ Cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }

  let processedCount = 0;

  for (const product of products) {
    // 1. تخطي المنتجات التي تمتلك رابط Cloudinary مسبقاً
    if (product.image_url && product.image_url.includes('res.cloudinary.com')) {
      continue;
    }

    console.log(`\n📦 معالجة منتج [${product.id}]: ${product.name}`);
    let targetImageUrl = null;

    // 2. التحقق من وجود صورة محلية مسبقاً (في public/products)
    let localImagePath = null;
    if (product.image_url && product.image_url.startsWith('/products/')) {
        localImagePath = path.join(PUBLIC_DIR, product.image_url);
        if (!fs.existsSync(localImagePath)) {
            localImagePath = null; // الصورة غير موجودة فعلياً
        }
    }

    if (localImagePath) {
        console.log(`  -> 📁 تم العثور على صورة محلية، سيتم الرفع إلى Cloudinary...`);
        try {
            const result = await cloudinary.uploader.upload(localImagePath, {
                folder: 'thara-products',
                public_id: `prod_${product.id}`
            });
            targetImageUrl = result.secure_url;
            console.log(`  -> ✅ تم الرفع بنجاح: ${targetImageUrl}`);
        } catch (error) {
            console.error(`  -> ❌ خطأ في رفع الصورة المحلية:`, error.message);
        }
    } else {
        // 3. البحث عن الصورة في الإنترنت (إذا لم توجد محلياً)
        if (cache[product.id] === 'not_found') {
            console.log(`  -> ⏭️ تم التخطي (مخزن مؤقتاً كـ غير موجود)`);
            continue;
        }

        if (cache[product.id] && cache[product.id].startsWith('http')) {
            console.log(`  -> ♻️ تم جلب الرابط من الذاكرة المؤقتة (Cache).`);
            targetImageUrl = cache[product.id];
        } else {
            console.log(`  -> 🔍 جاري البحث عبر Serper.dev عن: "${product.name}"...`);
            try {
                // نطلب البحث باسم المنتج
                const foundUrl = await searchImage(product.name);
                if (foundUrl) {
                    console.log(`  -> 🌐 تم العثور على صورة: ${foundUrl}`);
                    console.log(`  -> ☁️ جاري الرفع إلى Cloudinary...`);
                    const result = await cloudinary.uploader.upload(foundUrl, {
                        folder: 'thara-products',
                        public_id: `prod_${product.id}`
                    });
                    targetImageUrl = result.secure_url;
                    console.log(`  -> ✅ تم الرفع بنجاح: ${targetImageUrl}`);
                    
                    // حفظ في الـ Cache
                    cache[product.id] = targetImageUrl;
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
                } else {
                    console.log(`  -> ⚠️ لم يتم العثور على صور.`);
                    cache[product.id] = 'not_found';
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
                }
            } catch (error) {
                console.error(`  -> ❌ خطأ أثناء البحث/الرفع:`, error.message);
            }
        }
    }

    // 4. تحديث قاعدة البيانات
    if (targetImageUrl && targetImageUrl !== product.image_url) {
        console.log(`  -> 🗄️ جاري تحديث قاعدة البيانات للرابط الجديد...`);
        const safeUrl = targetImageUrl.replace(/'/g, "''");
        await runSql(`UPDATE products SET image_url = '${safeUrl}' WHERE id = ${product.id}`);
        console.log(`  -> ✅ تم تحديث قاعدة البيانات.`);
        processedCount++;
    }
  }

  console.log(`\n🎉 اكتملت العملية! تم معالجة وتحديث ${processedCount} منتج.`);
}

main().catch(err => {
  console.error('❌ حدث خطأ فادح:', err);
});
