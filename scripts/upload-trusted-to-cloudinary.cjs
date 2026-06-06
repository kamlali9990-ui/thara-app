const { execSync } = require('child_process');
const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvnhgvdd1',
  api_key: process.env.CLOUDINARY_API_KEY || '475255696212661',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const SUPABASE_CLI = 'D:\\ahmed\\TharaApp1\\node_modules\\.bin\\supabase';

function dbQuery(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const out = execSync(
    `cmd /c ""${SUPABASE_CLI}" db query "${escaped}" --linked --output json"`,
    { cwd: 'D:\\ahmed\\TharaApp1', encoding: 'utf-8', timeout: 60000, shell: 'cmd.exe' }
  );
  const parsed = JSON.parse(out);
  return parsed.rows || [];
}

function extractFileName(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/[^/]+\.(jpg|jpeg|png|gif|webp|svg)/i, '');
    const lastSeg = u.pathname.split('/').filter(Boolean).pop() || 'image';
    return (u.hostname + '-' + lastSeg).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  } catch {
    return 'img_' + Date.now();
  }
}

async function main() {
  console.log('=== جاري جلب المنتجات ذات الروابط الخارجية الموثوقة ===\n');

  const rows = dbQuery(
    'SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != \'\' AND image_url NOT ILIKE \'%res.cloudinary.com%\' AND image_url NOT ILIKE \'%tiktok%\' AND image_url NOT ILIKE \'%facebook%\' AND image_url NOT ILIKE \'%fbcdn%\' AND image_url NOT ILIKE \'%instagram%\' AND image_url NOT ILIKE \'%cdninstagram%\' AND image_url NOT ILIKE \'%pinimg%\' AND image_url NOT ILIKE \'%pinterest%\' AND image_url NOT ILIKE \'%twimg%\' AND image_url NOT ILIKE \'%twitter%\' AND image_url NOT ILIKE \'%unsplash%\' AND image_url NOT ILIKE \'%x.com%\' AND image_url NOT ILIKE \'data:\' AND image_url NOT ILIKE \'%LOGO.jpg%\' AND image_url NOT ILIKE \'%logo222%\''
  );

  console.log(`عدد المنتجات المستهدفة: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('لا توجد منتجات للرفع.');
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    const url = p.image_url?.trim();
    if (!url) { skipped++; continue; }

    const publicId = `thara-products/prod_${p.id}`;
    process.stdout.write(`[${i + 1}/${rows.length}] "${p.name}"... `);

    try {
      const result = await cloudinary.uploader.upload(url, {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        timeout: 30000
      });

      if (result?.secure_url) {
        dbQuery(`UPDATE products SET image_url = '${result.secure_url.replace(/'/g, "''")}' WHERE id = ${p.id}`);
        process.stdout.write(`✅ ${result.secure_url.slice(0, 60)}...\n`);
        success++;
      } else {
        process.stdout.write(`⚠️  لا يوجد secure_url\n`);
        failed++;
      }
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('Not Found') || err.message?.includes('not found')) {
        dbQuery(`UPDATE products SET image_url = '' WHERE id = ${p.id}`);
        process.stdout.write(`🔴 404 - تم مسح الرابط\n`);
        failed++;
      } else {
        process.stdout.write(`❌ ${err.message?.slice(0, 80)}\n`);
        failed++;
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== النتيجة ===`);
  console.log(`✅ نجح: ${success}`);
  console.log(`❌ فشل: ${failed}`);
  console.log(`⏭️  تخطي: ${skipped}`);
  console.log(`المجموع: ${rows.length}`);
}

main().catch(err => {
  console.error('خطأ عام:', err);
  process.exit(1);
});
