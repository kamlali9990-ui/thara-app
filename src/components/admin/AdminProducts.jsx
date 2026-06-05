import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { categories } from '../../data/mockData';
import { showToast } from '../Toast.jsx';
import * as XLSX from 'xlsx';
import CloudinaryUpload from './CloudinaryUpload';
import ImageSearch from './ImageSearch';
import { safeProductUrl, isBlockedImageUrl } from '../../utils/constants';

const ADMIN_LOGO = (import.meta.env.BASE_URL || '/') + 'LOGO.jpg';
const PAGE_SIZE = 50;
const ALL_CATS = categories.filter(c => c !== 'الكل' && c !== 'العروض');

function AdminProducts({ staffRole, products, addProduct, updateProduct, deleteProduct }) {
  const isAdmin = staffRole === 'admin';
  const isManager = staffRole === 'manager';
  const canManageProducts = isAdmin || isManager;
  const { bulkImportProducts } = useContext(StoreContext);
  const [form, setForm] = useState({ name: '', category: ALL_CATS[0] || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' });
  const [showImport, setShowImport] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editTargetId, setEditTargetId] = useState(null);
  const fileInputRef = useRef(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState([]);
  const nameInputRef = useRef(null);
  const debounceRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => parseInt(searchParams.get('p'), 10) || 1);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [imageSearchFor, setImageSearchFor] = useState(null); // null | { target: 'add'|'edit', query: string }
  const [fixingImages, setFixingImages] = useState(false);
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0 });
  const [fixFromPage, setFixFromPage] = useState('');
  const [fixToPage, setFixToPage] = useState('');
  const [cloudFromPage, setCloudFromPage] = useState('');
  const [cloudToPage, setCloudToPage] = useState('');
  const SERPER_KEY = '26d3cbd8de5a6fb4379330ffb423ac5159aad2b5';

  useEffect(() => {
    const params = {};
    if (page > 1) params.p = String(page);
    if (searchQuery) params.q = searchQuery;
    setSearchParams(params, { replace: true });
  }, [page, searchQuery, setSearchParams]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = products;
    if (String(searchQuery).trim()) {
      const q = String(searchQuery).trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const catCmp = (a.category || '').localeCompare(b.category || '', 'ar');
      if (catCmp !== 0) return catCmp;
      const aStock = (a.stock_quantity ?? 0) > 0 ? 0 : 1;
      const bStock = (b.stock_quantity ?? 0) > 0 ? 0 : 1;
      return aStock - bStock;
    });
  }, [products, searchQuery]);

  const pageCount = useMemo(() => Math.ceil(filteredAndSortedProducts.length / PAGE_SIZE) || 1, [filteredAndSortedProducts.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const paginatedProducts = useMemo(() =>
    filteredAndSortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredAndSortedProducts, page]
  );

  const searchSimilarProducts = useCallback((name) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name || name.length < 2) {
      setDuplicateProducts([]);
      setShowDuplicateWarning(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const searchTerm = String(name).toLowerCase().trim();
      const similar = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(p.name.toLowerCase())
      ).slice(0, 50);
      setDuplicateProducts(similar);
      setShowDuplicateWarning(similar.length > 0);
    }, 300);
  }, [products]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'name') searchSimilarProducts(value);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!String(form.name).trim()) return;

    if (editTargetId) {
      try {
        await updateProduct(editTargetId, {
          name: String(form.name).trim(), category: form.category,
          price: Number(form.price) || 0, stock_quantity: Number(form.stock_quantity) || 0,
          unit: String(form.unit).trim() || 'حبة', imageUrl: String(form.imageUrl).trim()
        });
        showToast('تم حفظ التعديلات', 'success');
        setEditTargetId(null);
        setForm({ name: '', category: ALL_CATS[0] || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' });
      } catch (err) {
        showToast('فشل الحفظ: ' + (err.message || ''), 'error');
      }
      return;
    }

    const exactDuplicate = products.find(p =>
      String(p.name).toLowerCase().trim() === String(form.name).toLowerCase().trim()
    );
    if (exactDuplicate) {
      showToast('يوجد منتج بنفس الاسم بالفعل! يرجى استخدام اسم مختلف', 'error');
      return;
    }
    try {
      await addProduct({
        name: String(form.name).trim(), category: form.category,
        price: Number(form.price) || 0, stock_quantity: Number(form.stock_quantity) || 0,
        imageUrl: String(form.imageUrl).trim() || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#127443" width="400" height="400"/><text fill="#FFFFFF" font-family="sans-serif" font-size="40" x="200" y="200" text-anchor="middle" dominant-baseline="middle">ثرا</text></svg>'),
        unit: String(form.unit).trim() || 'حبة', isOffer: false
      });
      setForm(prev => ({ ...prev, name: '', price: '', stock_quantity: '', imageUrl: '' }));
      setDuplicateProducts([]);
      setShowDuplicateWarning(false);
      showToast('تمت إضافة المنتج بنجاح', 'success');
    } catch (err) {}
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, category: product.category, price: product.price, stock_quantity: product.stock_quantity || 0, unit: product.unit || 'حبة', imageUrl: product.imageUrl || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    const duplicateWithName = products.find(p =>
      p.id !== id && String(p.name).toLowerCase().trim() === String(editForm.name).toLowerCase().trim()
    );
    if (duplicateWithName) {
      showToast('يوجد منتج آخر بنفس الاسم!', 'error');
      return;
    }
    try {
      await updateProduct(id, {
        name: String(editForm.name).trim(), category: editForm.category,
        price: Number(editForm.price) || 0, stock_quantity: Number(editForm.stock_quantity) || 0,
        unit: String(editForm.unit).trim() || 'حبة', imageUrl: String(editForm.imageUrl).trim()
      });
      showToast('تم حفظ التعديلات', 'success');
      setEditingId(null);
      setEditForm({});
      setTimeout(() => document.getElementById(`pr-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (err) {
      showToast('فشل الحفظ: ' + (err.message || ''), 'error');
    }
  };

  const CAT_MAP = {
    'مواد غذايه': 'مواد غذائية',
    'اكترونيات': 'إلكترونيات',
    'اواني': 'أواني',
    'خضروات و فواكه': 'خضروات وفواكه',
    'مواد البناء': 'مواد البناء',
    'مجموعه الاصناف': 'مجموعة الأصناف',
    'منتجات متنوعة': 'مجموعة الأصناف',
    'العاب': 'ألعاب'
  };

  const mapCategory = (cat) => {
    if (!cat) return 'مواد غذائية';
    const c = String(cat).trim();
    const groups = ['مواد غذائية','منظفات','إلكترونيات','أواني','مكسرات وبهارات','خضروات وفواكه','ألعاب','مجموعة الأصناف','ملابس','مواد البناء'];
    if (groups.includes(c)) return c;
    return CAT_MAP[c] || c;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', header: 1 });
        let start = -1;
        for (let i = 0; i < Math.min(20, raw.length); i++) {
          const row = raw[i];
          if (row[0] === 'م' || String(row[1] || '').includes('الصنف') || String(row[0] || '').includes('أسم')) {
            start = i; break;
          }
        }
        if (start === -1) start = 11;
        const result = [];
        for (let i = start + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r[1] || String(r[1]).trim() === '' || String(r[1]) === 'الإجمالي') continue;
          result.push({
            _row: i + 1,
            name: String(r[1] || '').trim(),
            category: mapCategory(r[7] || ''),
            price: parseFloat(String(r[4] || '0').replace(/,/g, '')) || 0,
            stock_quantity: parseInt(String(r[3] || '0').replace(/,/g, ''), 10) || 0,
            unit: String(r[2] || 'حبة').trim(),
            imageUrl: ''
          });
        }
        setPreviewRows(result);
        showToast(`تم قراءة ${result.length} منتج من الملف`, 'success');
      } catch (err) { showToast('فشل قراءة الملف: ' + (err.message || ''), 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (text) => {
    try {
      const rows = String(text).trim().split('\n').map((line, i) => {
        const parts = line.split('\t');
        if (parts.length < 2) parts.push(...line.split(','));
        return { _row: i + 1, name: parts[0], category: mapCategory(parts[1]), price: parseFloat(parts[2]) || 0, stock_quantity: parseInt(parts[3], 10) || 0, unit: parts[4] || 'حبة', imageUrl: parts[5] || '' };
      });
      setPreviewRows(rows);
    } catch { showToast('فشل تحليل النص', 'error'); }
  };

  const CHUNK_SIZE = 500;

  const doImport = async () => {
    if (!previewRows.length) return;
    setImporting(true);
    setImportProgress({ current: 0, total: previewRows.length });
    const mapped = previewRows.map(r => ({
      name: String(r.name || '').trim(),
      category: String(r.category || 'مواد غذائية').trim(),
      price: Number(r.price) || 0,
      stock_quantity: Number(r.stock_quantity) || 0,
      unit: String(r.unit || 'حبة').trim(),
      imageUrl: '',
      isOffer: false
    }));
    let totalCreated = 0;
    try {
      for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
        const chunk = mapped.slice(i, i + CHUNK_SIZE);
        const created = await bulkImportProducts(chunk);
        totalCreated += created.length;
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, mapped.length), total: mapped.length });
      }
      showToast(`تم استيراد ${totalCreated} منتج بنجاح`, 'success');
      setPreviewRows([]); setShowImport(false);
    } catch (err) { showToast(`فشل الاستيراد بعد ${totalCreated} منتج: ` + (err.message || ''), 'error'); }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const fixProductImages = async () => {
    let targets = products.filter(p => !p.imageUrl || p.imageUrl.includes('unsplash.com'));
    const from = parseInt(fixFromPage, 10) || 0;
    const to = parseInt(fixToPage, 10) || 0;
    if (from > 0) {
      const start = (from - 1) * PAGE_SIZE;
      const end = to >= from ? to * PAGE_SIZE : start + PAGE_SIZE;
      targets = filteredAndSortedProducts.slice(start, end).filter(p => !p.imageUrl || p.imageUrl.includes('unsplash.com'));
    }
    if (!targets.length) { showToast('لا توجد منتجات تحتاج تصحيح في هذه الصفحة', 'success'); return; }
    if (!SERPER_KEY) { showToast('مطلوب مفتاح Serper API', 'error'); return; }
    setFixingImages(true);
    setFixProgress({ current: 0, total: targets.length });
    let done = 0;
    for (const p of targets) {
      try {
        const res = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: p.name + ' ' + (p.category || ''), num: 10 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.images?.length > 0) {
            const validImage = data.images.find(img => img.imageUrl && !isBlockedImageUrl(img.imageUrl));
            let url = validImage ? validImage.imageUrl : null;
            if (url) { if (typeof url === 'string' && url.startsWith('http://')) url = 'https://' + url.slice(7); await updateProduct(p.id, { imageUrl: url }); }
          }
        }
      } catch {}
      done++;
      setFixProgress({ current: done, total: targets.length });
      await new Promise(r => setTimeout(r, 400));
    }
    setFixingImages(false);
    showToast(`تم تصحيح صور ${done} منتج`, 'success');
  };

  const [cloudUploading, setCloudUploading] = useState(false);
  const [cloudProgress, setCloudProgress] = useState({ current: 0, total: 0 });
  const cloudCancelRef = useRef(false);
  const cloudSigRef = useRef(null);

  const getCloudinarySignature = async () => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const sigRes = await fetch(baseUrl.replace(/\/+$/, '') + '/functions/v1/cloudinary-sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    if (!sigRes.ok) throw new Error('فشل الحصول على توقيع');
    return sigRes.json();
  };

  const batchUploadToCloudinary = async () => {
    let targets = products.filter(p => {
      const u = p.imageUrl;
      if (!u || typeof u !== 'string') return false;
      if (u.includes('res.cloudinary.com')) return false;
      if (u.startsWith('data:')) return false;
      if (u.includes('LOGO.jpg') || u.includes('logo222')) return false;
      return true;
    });
    const from = parseInt(cloudFromPage, 10) || 0;
    const to = parseInt(cloudToPage, 10) || 0;
    if (from > 0) {
      const start = (from - 1) * PAGE_SIZE;
      const end = to >= from ? to * PAGE_SIZE : start + PAGE_SIZE;
      targets = filteredAndSortedProducts.slice(start, end).filter(t => targets.includes(t));
    }
    if (!targets.length) { showToast('لا توجد منتجات تحتاج رفع', 'success'); return; }
    setCloudUploading(true);
    cloudCancelRef.current = false;
    setCloudProgress({ current: 0, total: targets.length });
    // Get initial signature
    let sigData;
    try {
      sigData = await getCloudinarySignature();
    } catch { setCloudUploading(false); showToast('فشل الاتصال بخدمة التوقيع', 'error'); return; }
    let done = 0, failed = 0;
    const SIG_REFRESH_EVERY = 40; // Refresh signature every 40 images to prevent expiration
    let sinceLastSig = 0;
    for (const p of targets) {
      if (cloudCancelRef.current) break;
      // Refresh signature periodically
      if (sinceLastSig >= SIG_REFRESH_EVERY) {
        try { sigData = await getCloudinarySignature(); sinceLastSig = 0; } catch { /* keep using old sig */ }
      }
      try {
        const form = new FormData();
        form.append('file', p.imageUrl);
        form.append('api_key', sigData.api_key);
        form.append('timestamp', String(sigData.timestamp));
        form.append('signature', sigData.signature);
        let upRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, { method: 'POST', body: form });
        // Retry once with fresh signature on auth/server errors
        if (!upRes.ok && (upRes.status === 401 || upRes.status === 403 || upRes.status === 500)) {
          try {
            sigData = await getCloudinarySignature(); sinceLastSig = 0;
            const retryForm = new FormData();
            retryForm.append('file', p.imageUrl);
            retryForm.append('api_key', sigData.api_key);
            retryForm.append('timestamp', String(sigData.timestamp));
            retryForm.append('signature', sigData.signature);
            upRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, { method: 'POST', body: retryForm });
          } catch { /* fall through to error handling */ }
        }
        if (!upRes.ok) {
          const errText = await upRes.text();
          console.warn(`[CloudUpload] فشل رفع "${p.name}" (${upRes.status}):`, errText.slice(0, 200), '| URL:', p.imageUrl?.slice(0, 80));
          if (upRes.status === 400 || upRes.status === 404) {
            console.log(`[CloudUpload] جاري مسح الرابط التالف لمنتج "${p.name}" ليتم اختيار صورة بديلة لاحقاً.`);
            try {
              await updateProduct(p.id, { imageUrl: '' });
            } catch (dbErr) {
              console.error(`[CloudUpload] فشل مسح الرابط من قاعدة البيانات:`, dbErr);
            }
          }
          throw new Error(errText.slice(0, 100));
        }
        const data = await upRes.json();
        if (data.secure_url) await updateProduct(p.id, { imageUrl: data.secure_url });
        done++;
      } catch (err) {
        failed++;
        console.warn(`[CloudUpload] تخطي "${p.name}":`, err.message || err);
      }
      sinceLastSig++;
      setCloudProgress({ current: done + failed, total: targets.length });
      await new Promise(r => setTimeout(r, 300));
    }
    setCloudUploading(false);
    if (cloudCancelRef.current) showToast(`تم إيقاف الرفع: ${done} تم, ${failed} فشل`, 'warning');
    else showToast(`تم رفع ${done} صورة لـ Cloudinary` + (failed ? `, فشل ${failed}` : ''), failed && failed === done ? 'error' : 'success');
    if (failed > 0) console.log(`[CloudUpload] ملخص: ${done} نجح, ${failed} فشل من أصل ${targets.length}`);
  };

  const cancelCloudUpload = () => { cloudCancelRef.current = true; };

  const PAGI_BTN = (disabled, label) => ({
    padding: '0.4rem 0.8rem', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)',
    background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
    color: disabled ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.85rem'
  });

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title products-title">إدارة المنتجات ({filteredAndSortedProducts.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1', maxWidth: '400px', margin: '0 1rem' }}>
          <input type="text" placeholder="🔍 بحث عن صنف للبدء في تعديله..."
            value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ 
              width: '100%', 
              background: 'rgba(18, 116, 67, 0.2)', 
              border: '1px solid rgba(18, 116, 67, 0.6)', 
              borderRadius: '10px', 
              padding: '0.6rem 1rem', 
              color: '#fff', 
              fontSize: '0.9rem', 
              fontFamily: 'inherit', 
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }} 
            onFocus={e => { e.target.style.border = '1px solid #fbbf24'; e.target.style.boxShadow = '0 0 10px rgba(251,191,36,0.3)'; }}
            onBlur={e => { e.target.style.border = '1px solid rgba(18, 116, 67, 0.6)'; e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }}
          />
        </div>
        {canManageProducts && <button className="btn" onClick={() => { setShowImport(!showImport); setPreviewRows([]); }}>استيراد</button>}
        {canManageProducts && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <input type="number" min="1" max={pageCount} value={fixFromPage} onChange={e => { setFixFromPage(e.target.value); setFixToPage(''); }} placeholder="من ص" style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '0.35rem 0.4rem', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
            {fixFromPage && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>-</span>}
            {fixFromPage && <input type="number" min={fixFromPage || 1} max={pageCount} value={fixToPage} onChange={e => setFixToPage(e.target.value)} placeholder="إلى ص" style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '0.35rem 0.4rem', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />}
            <button className="btn" onClick={fixProductImages} disabled={fixingImages} style={{ background: fixingImages ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', whiteSpace: 'nowrap' }}>{fixingImages ? 'جاري...' : '🖼 تصحيح'}</button>
          </div>
        )}
        {canManageProducts && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <input type="number" min="1" max={pageCount} value={cloudFromPage} onChange={e => { setCloudFromPage(e.target.value); setCloudToPage(''); }} placeholder="من ص" style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '0.35rem 0.4rem', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
            {cloudFromPage && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>-</span>}
            {cloudFromPage && <input type="number" min={cloudFromPage || 1} max={pageCount} value={cloudToPage} onChange={e => setCloudToPage(e.target.value)} placeholder="إلى ص" style={{ width: 50, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '0.35rem 0.4rem', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />}
            <button className="btn" onClick={cloudUploading ? cancelCloudUpload : batchUploadToCloudinary} style={{ background: cloudUploading ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.15)', borderColor: cloudUploading ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.3)', whiteSpace: 'nowrap' }}>{cloudUploading ? '⏹ إيقاف' : '☁️ رفع'}</button>
          </div>
        )}
      </div>
      {fixingImages && fixProgress.total > 0 && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(fixProgress.current / fixProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{fixProgress.current} / {fixProgress.total}</span>
        </div>
      )}
      {cloudUploading && cloudProgress.total > 0 && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(cloudProgress.current / cloudProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#2563eb)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>☁️ {cloudProgress.current} / {cloudProgress.total}</span>
        </div>
      )}

      {canManageProducts && showImport && (
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#f1f5f9', fontSize: '1rem' }}>استيراد منتجات</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#94a3b8', fontSize: '0.85rem' }}>رفع ملف</label>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ color: '#e2e8f0' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: '#94a3b8', fontSize: '0.85rem' }}>أو لصق (اسم، قسم، سعر، مخزون، وحدة، صورة)</label>
            <textarea rows={3} style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.5rem', color: '#e2e8f0', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
              placeholder={"أرز بسمتي\tمواد غذائية\t40\t50\tكيس"} onBlur={e => e.target.value.trim() && handlePaste(e.target.value)} />
          </div>
          {previewRows.length > 0 && (
            <>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{previewRows.length} منتج:</p>
              <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ color: '#94a3b8', borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}>
                    <th style={{ padding: '0.3rem', textAlign: 'right' }}>الاسم</th><th style={{ padding: '0.3rem', textAlign: 'right' }}>القسم</th>
                    <th style={{ padding: '0.3rem', textAlign: 'left' }}>السعر</th><th style={{ padding: '0.3rem', textAlign: 'left' }}>المخزون</th>
                  </tr></thead>
                  <tbody>{previewRows.slice(0, 100).map(r => (
                    <tr key={r._row} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.3rem', color: '#e2e8f0' }}>{r.name || '—'}</td>
                      <td style={{ padding: '0.3rem', color: '#94a3b8' }}>{r.category || '—'}</td>
                      <td style={{ padding: '0.3rem', color: '#fbbf24', textAlign: 'left' }}>{r.price || '—'}</td>
                      <td style={{ padding: '0.3rem', textAlign: 'left' }}>{r.stock_quantity || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {previewRows.length > 100 && <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>و {previewRows.length - 100} أخرى...</p>}
              </div>
              {importing && importProgress.total > 0 && (
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{importProgress.current} / {importProgress.total}</span>
                </div>
              )}
              <button className="btn" onClick={doImport} disabled={importing}>{importing ? 'جاري الاستيراد...' : `استيراد ${previewRows.length} منتج`}</button>
            </>
          )}
        </div>
      )}

      {canManageProducts && (
        <div className="admin-product-form-container">
          <form className="admin-product-form" onSubmit={handleAddProduct}>
            <div className="admin-product-form-row compact">
              <div className="admin-product-field-group name-field">
                <div className="admin-product-input-with-search">
                  <input 
                    ref={nameInputRef}
                    value={form.name} 
                    onChange={e => updateForm('name', e.target.value)} 
                    placeholder="اسم المنتج" 
                    className="admin-product-form-input" 
                    required 
                  />
                  {showDuplicateWarning && duplicateProducts.length > 0 && (
                    <div className="admin-duplicate-dropdown">
                      <div className="admin-duplicate-header">⚠️ منتجات مشابهة:</div>
                      {duplicateProducts.map(p => (
                        <div key={p.id} className="admin-duplicate-item" onClick={() => {
                          setForm({ name: p.name, category: p.category, price: p.price.toString(), stock_quantity: p.stock_quantity?.toString() || '', unit: p.unit || 'حبة', imageUrl: p.imageUrl || '' });
                          setEditTargetId(p.id);
                          setShowDuplicateWarning(false);
                          setDuplicateProducts([]);
                          nameInputRef.current?.blur();
                          setTimeout(() => document.querySelector('.admin-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                        }}>
                          <span className="admin-duplicate-name">{p.name}</span>
                          <span className="admin-duplicate-info">{p.price.toFixed(2)} ر.س</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-product-field-group cat-field">
                <select value={form.category} onChange={e => updateForm('category', e.target.value)} className="admin-product-form-input">
                  {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-product-field-group price-field">
                <input value={form.price} onChange={e => updateForm('price', e.target.value)} type="number" step="0.01" placeholder="السعر" className="admin-product-form-input" />
              </div>
              <div className="admin-product-field-group stock-field">
                <input value={form.stock_quantity} onChange={e => updateForm('stock_quantity', e.target.value)} type="number" placeholder="المخزون" className="admin-product-form-input" />
              </div>
              <div className="admin-product-field-group unit-field">
                <input value={form.unit} onChange={e => updateForm('unit', e.target.value)} placeholder="الوحدة" className="admin-product-form-input" />
              </div>
              <div className="admin-product-field-group img-field">
                <input value={form.imageUrl} onChange={e => updateForm('imageUrl', e.target.value)} placeholder="رابط الصورة" className="admin-product-form-input" />
              </div>
              <div className="admin-product-field-group upload-field" style={{ display: 'flex', gap: '0.35rem' }}>
                <CloudinaryUpload 
                  onUpload={(url) => updateForm('imageUrl', url)} 
                  onError={(err) => showToast('فشل رفع الصورة', 'error')} 
                />
                <button type="button" onClick={() => setImageSearchFor({ target: 'add', query: form.name })}
                  style={{ background: 'rgba(251,191,36,0.12)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '0.4rem 0.6rem', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  🔍 بحث
                </button>
              </div>
              {imageSearchFor?.target === 'add' && (
                <ImageSearch
                  defaultQuery={imageSearchFor.query}
                  onSelect={(url) => { updateForm('imageUrl', url); setImageSearchFor(null); }}
                  onClose={() => setImageSearchFor(null)}
                />
              )}
              <button className="admin-product-add-btn" type="submit">{editTargetId ? '💾 حفظ' : '+ إضافة'}</button>
              {editTargetId && (
                <button type="button" className="admin-product-cancel-btn" onClick={() => { setEditTargetId(null); setForm({ name: '', category: ALL_CATS[0] || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' }); }}>إلغاء</button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="admin-products-list">
        {paginatedProducts.map(p => (
          <div key={p.id} id={`pr-${p.id}`} className={`admin-product-row${editingId === p.id ? ' editing' : ''}`}>
            {editingId === p.id ? (
              <>
                <img src={safeProductUrl(p.imageUrl) || ADMIN_LOGO} alt="" className="pr-img" loading="lazy" onError={(e) => { if (e.target.src !== ADMIN_LOGO) e.target.src = ADMIN_LOGO; }} />
                <div className="pr-edit-inline">
                  <div className="pr-edit-field" style={{ flex: '2', minWidth: '80px' }}>
                    <label className="pr-edit-label">الاسم</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '1', minWidth: '60px' }}>
                    <label className="pr-edit-label">القسم</label>
                    <select value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} className="pr-edit-input">
                      {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.7', minWidth: '50px' }}>
                    <label className="pr-edit-label">السعر</label>
                    <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.6', minWidth: '40px' }}>
                    <label className="pr-edit-label">المخزون</label>
                    <input type="number" value={editForm.stock_quantity} onChange={e => setEditForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.5', minWidth: '35px' }}>
                    <label className="pr-edit-label">الوحدة</label>
                    <input type="text" value={editForm.unit} onChange={e => setEditForm(prev => ({ ...prev, unit: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.8', minWidth: '70px' }}>
                    <label className="pr-edit-label">الصورة</label>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <CloudinaryUpload 
                        onUpload={(url) => setEditForm(prev => ({ ...prev, imageUrl: url }))} 
                        onError={(err) => showToast('فشل رفع الصورة', 'error')} 
                      />
                      <button type="button" onClick={() => setImageSearchFor({ target: 'edit', query: editForm.name })}
                        style={{ background: 'rgba(251,191,36,0.12)', border: '0.5px solid rgba(251,191,36,0.25)', borderRadius: 6, padding: '0.3rem 0.5rem', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem' }}>
                        🔍
                      </button>
                    </div>
                  </div>
                  {imageSearchFor?.target === 'edit' && (
                    <ImageSearch
                      defaultQuery={imageSearchFor.query}
                      onSelect={(url) => { setEditForm(prev => ({ ...prev, imageUrl: url })); setImageSearchFor(null); }}
                      onClose={() => setImageSearchFor(null)}
                    />
                  )}
                  <div className="pr-edit-actions">
                    <button className="pr-save-btn" onClick={() => saveEdit(p.id)}>حفظ</button>
                    <button className="pr-cancel-btn" onClick={cancelEdit}>إلغاء</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <img src={safeProductUrl(p.imageUrl) || ADMIN_LOGO} alt="" className="pr-img" loading="lazy" onError={(e) => { if (e.target.src !== ADMIN_LOGO) e.target.src = ADMIN_LOGO; }} />
                <span className="pr-name">{p.name}</span>
                <span className="pr-cat">{p.category}</span>
                <span className="pr-price">{p.price?.toFixed(2)}</span>
                <span className="pr-stock">{p.stock_quantity ?? 0}</span>
                <span className="pr-unit">{p.unit}</span>
                {canManageProducts && (
                  <div className="pr-actions">
                    <button className="pr-edit-btn" onClick={() => startEdit(p)}>تعديل</button>
                    <button className="pr-delete-btn" onClick={() => { if (window.confirm('حذف المنتج؟')) deleteProduct(p.id); }}>حذف</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', marginTop: '0.5rem' }}>
          <button style={PAGI_BTN(page <= 1, '→ السابق')} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>→ السابق</button>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {page} / {pageCount}
          </span>
          <button style={PAGI_BTN(page >= pageCount, 'التالي ←')} disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>التالي ←</button>
        </div>
      )}
    </div>
  );
}

export default React.memo(AdminProducts);
