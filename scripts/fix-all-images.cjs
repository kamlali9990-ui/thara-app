const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://oqwphazzuxmrxwbnothk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NuFgM9QjjZiKxPl9zG_skw_v2bYekel';
const SERPER_KEY = '39abe056a67ee8f3662dd86248b8456adb260d13';

const CLOUD_NAME = 'dvnhgvdd1';
const CLOUD_API_KEY = '475255696212661';
const CLOUD_API_SECRET = 'Yiquuxk4nGn7dziVL7lkVNOy3Uc';

const BLOCKED = ['facebook.com', 'fbsbx.com', 'fbcdn.net', 'instagram.com', 'cdninstagram.com', 'pinterest.com', 'pinimg.com', 'twitter.com', 'twimg.com', 'tiktok.com', 'tiktokcdn', 'aalalkaif.com'];

function isBad(url) {
  if (!url || typeof url !== 'string') return true;
  const s = url.toLowerCase();
  if (!s) return true;
  if (s.includes('res.cloudinary.com')) return false;
  if (s.includes('logo222') || s.includes('logo.jpg')) return false;
  if (s.startsWith('data:')) return false;
  if (s.includes('unsplash.com')) return true;
  if (BLOCKED.some(d => s.includes(d))) return true;
  return true;
}

function cloudSig(params) {
  const sorted = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&');
  return crypto.createHash('sha1').update(sorted + CLOUD_API_SECRET).digest('hex');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const sup = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('جاري تحميل المنتجات من Supabase...');
  let all = [], from = 0;
  while (true) {
    const { data, error } = await sup.from('products').select('id, name, category, image_url').range(from, from + 999).order('id');
    if (error) { console.error('Supabase error:', error); return; }
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  
  const targets = all.filter(p => isBad(p.image_url));
  console.log(`\nإجمالي المنتجات: ${all.length}`);
  console.log(`المنتجات التي تحتاج صور: ${targets.length}\n`);
  
  if (targets.length === 0) {
    console.log('🎉 كل المنتجات تحتوي على صور جاهزة.');
    return;
  }
  
  let done = 0, success = 0, failed = 0;
  
  for (const p of targets) {
    done++;
    console.log(`\n[${done}/${targets.length}] ${p.name} (${p.id})`);
    console.log(`   الرابط الحالي: ${p.image_url || 'فارغ'}`);
    
    try {
      const currentUrl = p.image_url;
      
      if (currentUrl && typeof currentUrl === 'string' && currentUrl.startsWith('http') && !BLOCKED.some(d => currentUrl.toLowerCase().includes(d))) {
        console.log(`   ☁️ رفع الرابط الحالي مباشرة إلى Cloudinary...`);
        
        const ts = Math.round(Date.now() / 1000);
        const sig = cloudSig({ timestamp: String(ts) });
        
        const form = new URLSearchParams();
        form.append('file', currentUrl);
        form.append('api_key', CLOUD_API_KEY);
        form.append('timestamp', String(ts));
        form.append('signature', sig);
        
        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: form
        });
        
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.secure_url) {
            await sup.from('products').update({ image_url: upData.secure_url }).eq('id', p.id);
            console.log(`   ✅ ${upData.secure_url}`);
            success++;
            await sleep(2000);
            continue;
          }
        }
        console.log(`   ❌ فشل رفع الرابط الحالي`);
      }
      
      console.log(`   ⚠️ لا يمكن رفع الصورة، سيتم تعيينها إلى فارغ (logo222)`);
      await sup.from('products').update({ image_url: '' }).eq('id', p.id);
      failed++;
    } catch (err) {
      console.error(`   ❌ خطأ: ${err.message}`);
      failed++;
    }
    
    await sleep(3000);
  }
  
  console.log(`\n========================`);
  console.log(`✅ تم بنجاح: ${success}`);
  console.log(`❌ فشل: ${failed}`);
  console.log(`========================`);
})();
