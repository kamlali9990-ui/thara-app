import { useState } from 'react';
import CloudinaryUpload from './CloudinaryUpload';
import { showToast } from '../Toast';
import { BASE } from '../../utils/constants';
import { supabase } from '../../supabase/client';

const STORAGE_KEY = 'thara_banner_url';

const PRESET_BANNERS = [
  { label: 'البنر الافتراضي', url: `${BASE}123.jpg` },
];

export default function AdminSettings() {
  const [bannerUrl, setBannerUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || `${BASE}123.jpg`;
  });
  const [previewUrl, setPreviewUrl] = useState(bannerUrl);
  const [urlInput, setUrlInput] = useState('');

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

  // ---- Backup & Restore ----
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

  return (
    <div>
      <h2 className="admin-section-title">⚙️ إعدادات الصفحة الرئيسية</h2>

      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#f1f5f9', fontSize: '1.05rem' }}>صورة البنر الرئيسي</h3>

        <div className="banner-preview" style={{
          width: '100%', maxWidth: 500, marginBottom: '1.25rem', borderRadius: 16,
          overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <img src={previewUrl} alt="البنر" style={{
            width: '100%', display: 'block', aspectRatio: '2/1', objectFit: 'cover',
            background: '#0a5c34'
          }} onError={(e) => { e.target.src = `${BASE}123.jpg`; }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            رفع صورة جديدة
          </label>
          <CloudinaryUpload onUpload={handleUpload} onError={() => showToast('فشل رفع الصورة', 'error')} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            أو أدخل رابط الصورة مباشرة
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              style={{
                flex: 1, padding: '0.6rem 0.75rem', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.35)',
                color: '#e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none'
              }} />
            <button onClick={handleUrlSubmit} className="btn" style={{ whiteSpace: 'nowrap' }}>حفظ</button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            أو اختر من الصور الجاهزة
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_BANNERS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p.url)}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${p.url === bannerUrl ? '#fbbf24' : 'rgba(255,255,255,0.12)'}`,
                  background: p.url === bannerUrl ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'inherit'
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <button onClick={handleReset} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', padding: '0.4rem 1rem', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.8rem'
          }}>
            استعادة البنر الافتراضي
          </button>
        </div>
      </div>

      {/* ========== Backup & Restore Section ========== */}
      <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 className="admin-section-title" style={{ marginBottom: '1rem' }}>💾 النسخ الاحتياطي والاستعادة</h2>

        {/* Products */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderRadius: 12,
          background: 'rgba(210,180,140,0.06)', border: '1px solid rgba(210,180,140,0.12)',
          marginBottom: '0.75rem'
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>📦 الأصناف</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>تصدير جميع الأصناف مع الفئات والأسعار والمخزون</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportProducts} style={BACKUP_BTN}>تصدير</button>
            <label style={{ ...BACKUP_BTN, background: 'rgba(201,169,78,0.15)', border: '1px solid rgba(201,169,78,0.3)', cursor: 'pointer' }}>
              استيراد
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => importProducts(e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* Staff */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderRadius: 12,
          background: 'rgba(210,180,140,0.06)', border: '1px solid rgba(210,180,140,0.12)',
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>👥 الموظفين</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>تصدير جميع الموظفين (بدون كلمات المرور)</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportStaff} style={BACKUP_BTN}>تصدير</button>
            <label style={{ ...BACKUP_BTN, background: 'rgba(201,169,78,0.15)', border: '1px solid rgba(201,169,78,0.3)', cursor: 'pointer' }}>
              استيراد
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => importStaff(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

const BACKUP_BTN = {
  padding: '0.45rem 0.9rem', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700,
  background: 'rgba(210,180,140,0.1)', border: '1px solid rgba(210,180,140,0.2)',
  color: '#e2e8f0', whiteSpace: 'nowrap', transition: 'all 0.2s'
};

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
