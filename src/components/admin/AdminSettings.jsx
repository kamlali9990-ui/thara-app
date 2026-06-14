import { useState, useEffect } from 'react';
import CloudinaryUpload from './CloudinaryUpload';
import { showToast } from '../Toast';
import { BASE } from '../../utils/constants';
import { supabase } from '../../supabase/client';
import { sectionCats } from '../../data/categories';

const STORAGE_KEY = 'thara_banner_url';
const CAT_IMG_PREFIX = 'thara_cat_img_';

const PRESET_BANNERS = [
  { label: 'البنر الافتراضي', url: `${BASE}123.jpg` },
];

export default function AdminSettings() {
  const [bannerUrl, setBannerUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || `${BASE}123.jpg`;
  });
  const [previewUrl, setPreviewUrl] = useState(bannerUrl);
  const [urlInput, setUrlInput] = useState('');
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
          const name = row.key.replace('cat_img_', '');
          updates[name] = row.value;
          localStorage.setItem(CAT_IMG_PREFIX + name, row.value);
        }
        setCatImgs(prev => ({ ...prev, ...updates }));
      }
    };
    loadCatImgs();
  }, []);

  const saveBannerUrl = async (url) => {
    const finalUrl = url || `${BASE}123.jpg`;
    localStorage.setItem(STORAGE_KEY, finalUrl);
    window.dispatchEvent(new Event('thara:banner-changed'));
    setBannerUrl(finalUrl);
    setPreviewUrl(finalUrl);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'banner_url', value: finalUrl }, { onConflict: 'key' });
      if (error) throw error;
    } catch (e) {
      console.warn('Failed to sync banner to DB:', e);
    }
    showToast('تم حفظ صورة البنر بنجاح', 'success');
  };

  const handleUpload = (url) => {
    setPreviewUrl(url);
    setUrlInput(url);
    saveBannerUrl(url);
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) {
      showToast('الرجاء إدخال رابط صورة', 'warning');
      return;
    }
    saveBannerUrl(url);
  };

  const handlePreset = (url) => {
    setPreviewUrl(url);
    setUrlInput(url);
    saveBannerUrl(url);
  };

  const exportProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('id');
      if (error) throw error;
      downloadJSON(data, `products_backup_${new Date().toISOString().slice(0,10)}.json`);
      showToast('تم تصدير الأصناف بنجاح', 'success');
    } catch (e) {
      showToast('فشل تصدير الأصناف: ' + e.message, 'error');
    }
  };

  const exportStaff = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*').order('id');
      if (error) throw error;
      downloadJSON(data, `staff_backup_${new Date().toISOString().slice(0,10)}.json`);
      showToast('تم تصدير الموظفين بنجاح', 'success');
    } catch (e) {
      showToast('فشل تصدير الموظفين: ' + e.message, 'error');
    }
  };

  const importProducts = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items) || items.length === 0) throw new Error('ملف غير صالح');
      const { error } = await supabase.from('products').upsert(items, { onConflict: 'id', ignoreDuplicates: false });
      if (error) throw error;
      showToast(`تم استيراد ${items.length} صنف بنجاح`, 'success');
      window.dispatchEvent(new Event('thara:products-changed'));
    } catch (e) {
      showToast('فشل استيراد الأصناف: ' + e.message, 'error');
    }
  };

  const importStaff = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items) || items.length === 0) throw new Error('ملف غير صالح');
      const { error } = await supabase.from('staff').upsert(items, { onConflict: 'id', ignoreDuplicates: false });
      if (error) throw error;
      showToast(`تم استيراد ${items.length} موظف بنجاح`, 'success');
    } catch (e) {
      showToast('فشل استيراد الموظفين: ' + e.message, 'error');
    }
  };

  const handleReset = () => {
    const defaultUrl = `${BASE}123.jpg`;
    localStorage.removeItem(STORAGE_KEY);
    setBannerUrl(defaultUrl);
    setPreviewUrl(defaultUrl);
    setUrlInput('');
    saveBannerUrl(defaultUrl);
  };

  const saveCatImage = async (catName, url) => {
    const key = 'cat_img_' + catName;
    localStorage.setItem(CAT_IMG_PREFIX + catName, url);
    setCatImgs(prev => ({ ...prev, [catName]: url }));
    window.dispatchEvent(new CustomEvent('thara:cat-img-changed', { detail: { name: catName, url } }));
    try {
      await supabase.from('settings').upsert({ key, value: url }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Failed to sync cat img to DB:', e);
    }
    showToast(`تم حفظ صورة "${catName}" بنجاح`, 'success');
  };

  const resetCatImage = async (catName) => {
    const key = 'cat_img_' + catName;
    localStorage.removeItem(CAT_IMG_PREFIX + catName);
    setCatImgs(prev => { const n = { ...prev }; delete n[catName]; return n; });
    window.dispatchEvent(new CustomEvent('thara:cat-img-changed', { detail: { name: catName, url: null } }));
    try {
      await supabase.from('settings').delete().eq('key', key);
    } catch (e) {
      console.warn('Failed to delete cat img from DB:', e);
    }
    showToast(`تم استعادة الصورة الافتراضية لـ "${catName}"`, 'success');
  };

  return (
    <div>
      <h2 className="admin-section-title">⚙️ إعدادات الصفحة الرئيسية</h2>

      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--admin-text)', fontSize: '1.05rem' }}>صورة البنر الرئيسي</h3>

        <div className="banner-preview" style={{
          width: '100%', maxWidth: 500, marginBottom: '1.25rem', borderRadius: 16,
          overflow: 'hidden', background: 'var(--admin-highlight-bg)', border: '1px solid var(--admin-border)'
        }}>
          <img src={previewUrl} alt="البنر" style={{
            width: '100%', display: 'block', aspectRatio: '2/1', objectFit: 'cover',
            background: 'var(--admin-accent)'
          }} onError={(e) => { e.target.src = `${BASE}123.jpg`; }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            رفع صورة جديدة
          </label>
          <CloudinaryUpload onUpload={handleUpload} onError={() => showToast('فشل رفع الصورة', 'error')} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            أو أدخل رابط الصورة مباشرة
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              style={{
                flex: 1, padding: '0.6rem 0.75rem', borderRadius: 10,
                border: '0.5px solid var(--admin-border)', background: 'var(--admin-input-bg)',
                color: 'var(--admin-text)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none'
              }} />
            <button onClick={handleUrlSubmit} className="btn" style={{ whiteSpace: 'nowrap', background: 'var(--admin-accent)', color: 'var(--admin-accent-text)', border: 'none', borderRadius: 8, padding: '0.6rem 1.4rem', cursor: 'pointer', fontFamily: 'inherit' }}>حفظ</button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            أو اختر من الصور الجاهزة
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_BANNERS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p.url)}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${p.url === bannerUrl ? 'var(--admin-warning)' : 'var(--admin-border)'}`,
                  background: p.url === bannerUrl ? 'rgba(var(--admin-warning-rgb), 0.1)' : 'var(--admin-highlight-bg)',
                  color: 'var(--admin-text)', fontSize: '0.8rem', fontFamily: 'inherit'
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--admin-border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <button onClick={handleReset} style={{
            background: 'rgba(var(--admin-danger-rgb), 0.1)', border: '1px solid rgba(var(--admin-danger-rgb), 0.2)',
            color: 'var(--admin-danger)', padding: '0.4rem 1rem', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.8rem'
          }}>
            استعادة البنر الافتراضي
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--admin-text)', fontSize: '1.05rem' }}>🖼️ صور الأقسام</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {sectionCats.map(cat => {
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
                    fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0
                  }}>
                    استعادة الصورة الافتراضية
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>💾 النسخ الاحتياطي والاستعادة</h2>

        <div className="admin-settings-backup-card">
          <div>
            <div className="admin-settings-backup-title">📦 الأصناف</div>
            <div className="admin-settings-backup-desc">تصدير جميع الأصناف مع الفئات والأسعار والمخزون</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportProducts} className="admin-settings-backup-btn">تصدير</button>
            <label className="admin-settings-backup-btn admin-settings-backup-import">
              استيراد
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => importProducts(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="admin-settings-backup-card" style={{ marginTop: '0.75rem' }}>
          <div>
            <div className="admin-settings-backup-title">👥 الموظفين</div>
            <div className="admin-settings-backup-desc">تصدير جميع الموظفين (بدون كلمات المرور)</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportStaff} className="admin-settings-backup-btn">تصدير</button>
            <label className="admin-settings-backup-btn admin-settings-backup-import">
              استيراد
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => importStaff(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
