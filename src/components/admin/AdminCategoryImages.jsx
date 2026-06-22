import { useState, useEffect } from 'react';
import CloudinaryUpload from './CloudinaryUpload';
import { showToast } from '../Toast';
import { supabase } from '../../supabase/client';
import { sectionCats, specialSections } from '../../data/categories';

const CAT_IMG_PREFIX = 'thara_cat_img_';

export default function AdminCategoryImages() {
  const [catImgs, setCatImgs] = useState(() => {
    const saved = {};
    for (const cat of sectionCats) {
      const stored = localStorage.getItem(CAT_IMG_PREFIX + cat.name);
      if (stored) saved[cat.name] = stored;
    }
    return saved;
  });

  useEffect(() => {
    const loadCatImgs = async () => {
      const { data } = await supabase.from('settings').select('key, value').like('key', 'cat_img_%');
      if (data) {
        const updates = {};
        for (const row of data) {
          if (row.key.endsWith('_ver')) continue;
          const name = row.key.replace('cat_img_', '');
          updates[name] = row.value;
          localStorage.setItem(CAT_IMG_PREFIX + name, row.value);
        }
        for (const row of data) {
          if (row.key.endsWith('_ver')) {
            const name = row.key.replace('cat_img__ver', '').replace('cat_img_', '');
            if (name) localStorage.setItem(CAT_IMG_PREFIX + 'ver_' + name, row.value);
          }
        }
        setCatImgs(prev => ({ ...prev, ...updates }));
      }
    };
    loadCatImgs();
  }, []);

  const saveCatImage = async (catName, url) => {
    const key = 'cat_img_' + catName;
    const verKey = key + '_ver';
    const ver = Date.now().toString();
    localStorage.setItem(CAT_IMG_PREFIX + catName, url);
    localStorage.setItem(CAT_IMG_PREFIX + 'ver_' + catName, ver);
    setCatImgs(prev => ({ ...prev, [catName]: url }));
    window.dispatchEvent(new CustomEvent('thara:cat-img-changed', { detail: { name: catName, url } }));
    try {
      await supabase.from('settings').upsert({ key, value: url }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: verKey, value: ver }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Failed to sync cat img to DB:', e);
    }
    showToast(`تم حفظ صورة "${catName}" بنجاح`, 'success');
  };

  const resetCatImage = async (catName) => {
    const key = 'cat_img_' + catName;
    const verKey = key + '_ver';
    localStorage.removeItem(CAT_IMG_PREFIX + catName);
    localStorage.removeItem(CAT_IMG_PREFIX + 'ver_' + catName);
    setCatImgs(prev => { const n = { ...prev }; delete n[catName]; return n; });
    window.dispatchEvent(new CustomEvent('thara:cat-img-changed', { detail: { name: catName, url: null } }));
    try {
      await supabase.from('settings').delete().eq('key', key);
      await supabase.from('settings').delete().eq('key', verKey);
    } catch (e) {
      console.warn('Failed to delete cat img from DB:', e);
    }
    showToast(`تم استعادة الصورة الافتراضية لـ "${catName}"`, 'success');
  };

  const allCats = [...sectionCats, ...specialSections];

  return (
    <div>
      <h2 className="admin-section-title">🖼️ تغيير صور الأقسام</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        اختر القسم الذي تريد تغيير صورته الظاهرة في الصفحة الرئيسية للعملاء:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {allCats.map(cat => {
          const currentImg = catImgs[cat.name] || cat.img;
          return (
            <div key={cat.name} style={{
              background: 'var(--admin-highlight-bg)', borderRadius: 12, padding: '0.75rem',
              border: '1px solid var(--admin-border)'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--admin-text)' }}>
                {cat.fallback} {cat.name}
              </div>
              <img src={currentImg} alt={cat.name}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 8, marginBottom: '0.5rem', background: cat.color }}
                onError={(e) => { e.target.src = cat.img; }} />
              <CloudinaryUpload
                onUpload={(url) => saveCatImage(cat.name, url)}
                onError={() => showToast('فشل رفع الصورة', 'error')} />
              {catImgs[cat.name] && (
                <button onClick={() => resetCatImage(cat.name)} style={{
                  marginTop: '0.35rem', background: 'none', border: 'none', color: 'var(--admin-danger)',
                  fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0, display: 'block'
                }}>
                  استعادة الصورة الافتراضية
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
