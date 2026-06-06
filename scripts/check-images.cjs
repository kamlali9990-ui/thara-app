const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oqwphazzuxmrwxbnothk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function main() {
  // First get total count
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=count`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  const total = parseInt(await countRes.text());
  console.log(`إجمالي المنتجات: ${total}`);

  // Get all image URLs (in batches to avoid timeout)
  let allImages = [];
  let offset = 0;
  const limit = 1000;
  while (offset < total) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,image_url&limit=${limit}&offset=${offset}`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const data = await res.json();
    allImages = allImages.concat(data);
    offset += limit;
    console.log(`  جلب ${offset}/${total}...`);
  }

  // Analyze
  const noImage = allImages.filter(p => !p.image_url || p.image_url === '').length;
  const cloudinary = allImages.filter(p => p.image_url && p.image_url.includes('res.cloudinary.com')).length;
  const external = allImages.filter(p => p.image_url && p.image_url !== '' && !p.image_url.includes('res.cloudinary.com')).length;

  const blockedDomains = [
    { name: 'tiktok', pattern: /tiktok/i },
    { name: 'facebook/fbcdn', pattern: /facebook|fbcdn/i },
    { name: 'instagram/cdninstagram', pattern: /instagram|cdninstagram/i },
    { name: 'pinterest', pattern: /pinterest/i },
    { name: 'twitter/x.com', pattern: /x\.com|twitter/i },
    { name: 'unsplash', pattern: /unsplash/i },
    { name: 'pinimg', pattern: /pinimg/i },
    { name: 'twimg', pattern: /twimg/i },
  ];

  console.log('\n=== إحصائيات الصور ===');
  console.log(`بدون صورة:         ${noImage}`);
  console.log(`Cloudinary:         ${cloudinary}`);
  console.log(`رابط خارجي:         ${external}`);
  console.log(`نسبة Cloudinary:     ${((cloudinary / (total - noImage)) * 100).toFixed(1)}%`);

  console.log('\n=== تحليل الروابط الخارجية ===');
  for (const d of blockedDomains) {
    const count = allImages.filter(p => p.image_url && d.pattern.test(p.image_url)).length;
    console.log(`  ${d.name}: ${count}`);
  }

  // Show sample of external URLs that are NOT blocked domains
  const externalNonBlocked = allImages.filter(p => {
    if (!p.image_url || p.image_url.includes('res.cloudinary.com')) return false;
    return !blockedDomains.some(d => d.pattern.test(p.image_url));
  });

  console.log(`\nروابط خارجية غير محظورة: ${externalNonBlocked.length}`);
  if (externalNonBlocked.length > 0) {
    console.log('\nنماذج (أول 20):');
    externalNonBlocked.slice(0, 20).forEach(p => {
      console.log(`  [${p.id}] ${p.name}: ${p.image_url.slice(0, 100)}`);
    });
  }
}

main().catch(e => console.error(e));
