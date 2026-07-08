import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import { categories } from '../../data/mockData';
import { showToast } from '../Toast';
import CloudinaryUpload from './CloudinaryUpload';
import { safeProductUrl, logoPath, BASE } from '../../utils/constants';
import type { Product } from '../../types';

const ADMIN_LOGO = logoPath;
const PAGE_SIZE = 50;
const ALL_CATS = categories.filter((c: string) => c !== 'الكل' && c !== 'العروض');

const CAT_IMAGES: Record<string, string> = {
  'مواد غذائية': 'cat_canned.jpg', 'منظفات': 'cat_vegetables.jpg',
  'إلكترونيات': 'الكترونيات.jpg', 'أواني': 'اواني.jpg',
  'مكسرات وبهارات': 'cat_canned.jpg', 'خضروات وفواكه': 'Getty.webp',
  'ألعاب': 'العاب.jpg', 'مجموعة الأصناف': 'cat_dairy.jpg',
  'ملابس': 'ملابس.jpg', 'مواد البناء': 'cat_hardware.jpg',
  'العطور': 'العطور.jpg'
};
const getCatImageUrl = (cat: string) => `${BASE}${CAT_IMAGES[cat] || 'cat_canned.jpg'}`;

interface FormState {
  name: string;
  category: string;
  price: string;
  stock_quantity: string;
  unit: string;
  imageUrl: string;
}

function AdminProducts({ staffRole, products, addProduct, updateProduct, deleteProduct }: {
  staffRole: string;
  products: Product[];
  addProduct: (data: any) => Promise<void>;
  updateProduct: (id: number, data: any) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
}) {
  const isAdmin = staffRole === 'admin';
  const isManager = staffRole === 'manager';
  const canManageProducts = isAdmin || isManager;
  const { bulkImportProducts } = useContext(StoreContext);
  const [form, setForm] = useState<FormState>({ name: '', category: ALL_CATS[0] || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' });
  const [showImport, setShowImport] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState<Product[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => parseInt(searchParams.get('p') || '10', 10) || 1);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');


  useEffect(() => {
    const params: Record<string, string> = {};
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
    const imgPriority = (p: any) => {
      if (!p.imageUrl) return 0;
      if (!p.imageUrl.includes('res.cloudinary.com')) return 1;
      return 2;
    };
    return [...list].sort((a: any, b: any) => {
      const imgDiff = imgPriority(a) - imgPriority(b);
      if (imgDiff !== 0) return imgDiff;
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

  const searchSimilarProducts = useCallback((name: string) => {
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

  const updateForm = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'name') searchSimilarProducts(value);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
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
      } catch (err: any) {
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
    } catch (err: any) { showToast('فشل إضافة المنتج: ' + (err.message || err), 'error'); }
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, category: product.category, price: product.price, stock_quantity: product.stock_quantity || 0, unit: product.unit || 'حبة', imageUrl: product.imageUrl || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id: number) => {
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
    } catch (err: any) {
      showToast('فشل الحفظ: ' + (err.message || ''), 'error');
    }
  };

  const CAT_MAP: Record<string, string> = {
    'مواد غذايه': 'مواد غذائية',
    'اكترونيات': 'إلكترونيات',
    'اواني': 'أواني',
    'خضروات و فواكه': 'خضروات وفواكه',
    'مواد البناء': 'مواد البناء',
    'مجموعه الاصناف': 'مجموعة الأصناف',
    'منتجات متنوعة': 'مجموعة الأصناف',
    'العاب': 'ألعاب'
  };

  const mapCategory = (cat: string) => {
    if (!cat) return 'مواد غذائية';
    const c = String(cat).trim();
    const groups = ['مواد غذائية','منظفات','إلكترونيات','أواني','مكسرات وبهارات','خضروات وفواكه','ألعاب','مجموعة الأصناف','ملابس','مواد البناء'];
    if (groups.includes(c)) return c;
    return CAT_MAP[c] || c;
  };

  const DEFAULT_UNITS: Record<string, string> = {
    'مواد غذائية': 'حبة', 'منظفات': 'زجاجة', 'ألعاب': 'حبة',
    'مكسرات وبهارات': 'علبة', 'أواني': 'حبة', 'خضروات وفواكه': 'كجم',
    'إلكترونيات': 'حبة', 'مجموعة الأصناف': 'حبة', 'ملابس': 'حبة', 'مواد البناء': 'حبة'
  };

  const getUnitForCategory = (cat: string) => DEFAULT_UNITS[cat] || 'حبة';

  const HEADER_KEYS: Record<string, string[]> = {
    name: ['أسم الصنف', 'اسم الصنف', 'الصنف', 'الاسم', 'اسم المنتج'],
    price: ['سعر البيع', 'السعر', 'سعر'],
    stock: ['الكمية', 'المخزون', 'كمية', 'مخزون', 'الرصيد'],
    category: ['اسم المجموعة', 'المجموعة', 'القسم', 'مجموعة', 'التصنيف'],
    unit: ['الوحدة', 'وحدة', 'unit']
  };

  const detectHeaderRow = (rows: any[][]) => {
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      const joined = row.join(' ').trim();
      if (joined.includes('الصنف') || joined.includes('أسم') || joined.includes('السعر') || joined.includes('المجموعة')) return i;
    }
    return 11;
  };

  const mapColumns = (header: any[]) => {
    const colMap: Record<string, number> = {};
    const allKeys: Array<{ key: string; kw: string }> = [];
    for (const [key, keywords] of Object.entries(HEADER_KEYS)) {
      for (const kw of keywords) allKeys.push({ key, kw });
    }
    allKeys.sort((a, b) => b.kw.length - a.kw.length || a.key.localeCompare(b.key));
    header.forEach((cell, idx) => {
      const val = String(cell).trim();
      const first = allKeys.find(({ kw }) => val.includes(kw));
      if (first && colMap[first.key] === undefined) colMap[first.key] = idx;
    });
    colMap.name ??= 1;
    colMap.price ??= 4;
    colMap.stock ??= 3;
    colMap.category ??= 7;
    return colMap;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target!.result, { type: 'array' });
        const raw: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', header: 1 });
        const headerRow = detectHeaderRow(raw);
        const colMap = mapColumns(raw[headerRow] || []);
        const result = [];
        for (let i = headerRow + 1; i < raw.length; i++) {
          const r = raw[i];
          const name = String(r[colMap.name] || '').trim();
          if (!name || name === 'الإجمالي') continue;
          const category = mapCategory(r[colMap.category] || '');
          result.push({
            _row: i + 1,
            name,
            category,
            price: parseFloat(String(r[colMap.price] || '0').replace(/,/g, '')) || 0,
            stock_quantity: parseInt(String(r[colMap.stock] || '0').replace(/,/g, ''), 10) || 0,
            unit: colMap.unit !== undefined ? String(r[colMap.unit] || 'حبة').trim() : getUnitForCategory(category),
            imageUrl: getCatImageUrl(category)
          });
        }
        setPreviewRows(result);
        showToast(`تم قراءة ${result.length} منتج من الملف`, 'success');
      } catch (err: any) { showToast('فشل قراءة الملف: ' + (err.message || ''), 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (text: string) => {
    try {
      const rows = String(text).trim().split('\n').map((line, i) => {
        const parts = line.split('\t');
        if (parts.length < 2) parts.push(...line.split(','));
        const category = mapCategory(parts[1]);
        return { _row: i + 1, name: parts[0], category, price: parseFloat(parts[2]) || 0, stock_quantity: parseInt(parts[3], 10) || 0, unit: parts[4] || 'حبة', imageUrl: parts[5] || getCatImageUrl(category) };
      });
      setPreviewRows(rows);
    } catch { showToast('فشل تحليل النص', 'error'); }
  };

  const CHUNK_SIZE = 500;
  const UPDATE_CONCURRENCY = 20;

  const doImport = async () => {
    if (!previewRows.length) return;
    setImporting(true);
    setImportProgress({ current: 0, total: previewRows.length });

    const nameMap: Record<string, any> = {};
    for (const p of products) {
      nameMap[p.name.trim().toLowerCase()] = p;
    }

    const toCreate: any[] = [];
    const toUpdate: any[] = [];

    for (const r of previewRows) {
      const name = String(r.name || '').trim();
      if (!name) continue;
      const existing = nameMap[name.toLowerCase()];
      if (existing) {
        const updates: any = { id: existing.id, name, category: String(r.category || existing.category).trim(), price: Number(r.price) || 0, unit: String(r.unit || existing.unit).trim() };
        const s = Number(r.stock_quantity) || 0;
        if (s > 0) updates.stock_quantity = s;
        toUpdate.push(updates);
      } else {
        const cat = String(r.category || 'مواد غذائية').trim();
        toCreate.push({ name, category: cat, price: Number(r.price) || 0, stock_quantity: Number(r.stock_quantity) || 0, unit: String(r.unit || 'حبة').trim(), imageUrl: getCatImageUrl(cat), isOffer: false });
      }
    }

    let updatedCount = 0;
    let createdCount = 0;
    const total = toUpdate.length + toCreate.length;

    try {
      for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
        const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
        await Promise.all(batch.map((item: any) => {
          const upd: any = { price: item.price, unit: item.unit, category: item.category };
          if (item.stock_quantity !== undefined) upd.stock_quantity = item.stock_quantity;
          return updateProduct(item.id, upd);
        }));
        updatedCount += batch.length;
        setImportProgress({ current: updatedCount + createdCount, total });
      }
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + CHUNK_SIZE);
        const created = await bulkImportProducts(chunk);
        createdCount += created.length;
        setImportProgress({ current: updatedCount + createdCount, total });
      }
      showToast(`تم تحديث ${updatedCount} منتج وإضافة ${createdCount} منتج جديد`, 'success');
      setPreviewRows([]); setShowImport(false);
    } catch (err: any) { showToast(`فشل الاستيراد بعد تحديث ${updatedCount} وإضافة ${createdCount}: ` + (err.message || ''), 'error'); }
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const PAGI_BTN = (disabled: boolean, label: string): React.CSSProperties => ({
    padding: '0.4rem 0.8rem', borderRadius: 8, border: '0.5px solid var(--admin-border)',
    background: disabled ? 'transparent' : 'var(--admin-highlight-bg)',
    color: disabled ? 'var(--admin-text-muted)' : 'var(--admin-text)',
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
            className="admin-product-search"
          />
        </div>
        {canManageProducts && <button className="btn" onClick={() => { setShowImport(!showImport); setPreviewRows([]); }}>استيراد</button>}
      </div>

      {canManageProducts && showImport && (
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--admin-text)', fontSize: '1rem' }}>استيراد منتجات</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>رفع ملف</label>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ color: 'var(--admin-text)' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>أو لصق (اسم، قسم، سعر، مخزون، وحدة، صورة)</label>
            <textarea rows={3} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '0.5px solid var(--admin-border)', borderRadius: 8, padding: '0.5rem', color: 'var(--admin-text)', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
              placeholder={"أرز بسمتي\tمواد غذائية\t40\t50\tكيس"} onBlur={e => e.target.value.trim() && handlePaste(e.target.value)} />
          </div>
          {previewRows.length > 0 && (
            <>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{previewRows.length} منتج:</p>
              <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ color: 'var(--admin-text-muted)', borderBottom: '0.5px solid var(--admin-border)' }}>
                    <th style={{ padding: '0.3rem', textAlign: 'right' }}>الاسم</th><th style={{ padding: '0.3rem', textAlign: 'right' }}>القسم</th>
                    <th style={{ padding: '0.3rem', textAlign: 'left' }}>السعر</th><th style={{ padding: '0.3rem', textAlign: 'left' }}>المخزون</th>
                  </tr></thead>
                  <tbody>{previewRows.slice(0, 100).map((r: any) => (
                    <tr key={r._row} style={{ borderBottom: '0.5px solid var(--admin-border)' }}>
                      <td style={{ padding: '0.3rem', color: 'var(--admin-text)' }}>{r.name || '—'}</td>
                      <td style={{ padding: '0.3rem', color: 'var(--admin-text-muted)' }}>{r.category || '—'}</td>
                      <td style={{ padding: '0.3rem', color: 'var(--admin-warning)', textAlign: 'left' }}>{r.price || '—'}</td>
                      <td style={{ padding: '0.3rem', textAlign: 'left' }}>{r.stock_quantity || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {previewRows.length > 100 && <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>و {previewRows.length - 100} أخرى...</p>}
              </div>
              {importing && importProgress.total > 0 && (
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--admin-highlight-bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,var(--admin-success),var(--admin-accent))', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{importProgress.current} / {importProgress.total}</span>
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
                          setForm({ name: p.name, category: p.category || ALL_CATS[0], price: p.price.toString(), stock_quantity: p.stock_quantity?.toString() || '', unit: p.unit || 'حبة', imageUrl: (p as any).imageUrl || '' });
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
                  {ALL_CATS.map((c: string) => <option key={c} value={c}>{c}</option>)}
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
              <CloudinaryUpload 
                onUpload={(url: string) => updateForm('imageUrl', url)} 
                onError={(err: any) => showToast('فشل رفع الصورة', 'error')} 
              />
              <button className="admin-product-add-btn" type="submit">{editTargetId ? '💾 حفظ' : '+ إضافة'}</button>
              {editTargetId && (
                <button type="button" className="admin-product-cancel-btn" onClick={() => { setEditTargetId(null); setForm({ name: '', category: ALL_CATS[0] || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' }); }}>إلغاء</button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="admin-products-list">
        {paginatedProducts.map((p: any) => (
          <div key={p.id} id={`pr-${p.id}`} className={`admin-product-row${editingId === p.id ? ' editing' : ''}`}>
            {editingId === p.id ? (
              <>
                <img src={safeProductUrl(p.imageUrl) || ADMIN_LOGO} alt="" className="pr-img" loading="lazy" onError={(e) => { if ((e.target as HTMLImageElement).src !== ADMIN_LOGO) (e.target as HTMLImageElement).src = ADMIN_LOGO; }} />
                <div className="pr-edit-inline">
                  <div className="pr-edit-field" style={{ flex: '2', minWidth: '80px' }}>
                    <label className="pr-edit-label">الاسم</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '1', minWidth: '60px' }}>
                    <label className="pr-edit-label">القسم</label>
                    <select value={editForm.category} onChange={e => setEditForm((prev: any) => ({ ...prev, category: e.target.value }))} className="pr-edit-input">
                      {ALL_CATS.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.7', minWidth: '50px' }}>
                    <label className="pr-edit-label">السعر</label>
                    <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.6', minWidth: '40px' }}>
                    <label className="pr-edit-label">المخزون</label>
                    <input type="number" value={editForm.stock_quantity} onChange={e => setEditForm((prev: any) => ({ ...prev, stock_quantity: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.5', minWidth: '35px' }}>
                    <label className="pr-edit-label">الوحدة</label>
                    <input type="text" value={editForm.unit} onChange={e => setEditForm((prev: any) => ({ ...prev, unit: e.target.value }))} className="pr-edit-input" />
                  </div>
                  <div className="pr-edit-field" style={{ flex: '0.8', minWidth: '70px' }}>
                    <label className="pr-edit-label">الصورة</label>
                    <CloudinaryUpload 
                      onUpload={(url: string) => setEditForm((prev: any) => ({ ...prev, imageUrl: url }))} 
                      onError={(err: any) => showToast('فشل رفع الصورة', 'error')} 
                    />
                  </div>
                  <div className="pr-edit-actions">
                    <button className="pr-save-btn" onClick={() => saveEdit(p.id)}>حفظ</button>
                    <button className="pr-cancel-btn" onClick={cancelEdit}>إلغاء</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <img src={safeProductUrl(p.imageUrl) || ADMIN_LOGO} alt="" className="pr-img" loading="lazy" onError={(e) => { if ((e.target as HTMLImageElement).src !== ADMIN_LOGO) (e.target as HTMLImageElement).src = ADMIN_LOGO; }} />
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
          <button style={PAGI_BTN(page <= 1, '→ السابق')} disabled={page <= 1} onClick={() => setPage((p: number) => Math.max(1, p - 1))}>→ السابق</button>
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            {page} / {pageCount}
          </span>
          <button style={PAGI_BTN(page >= pageCount, 'التالي ←')} disabled={page >= pageCount} onClick={() => setPage((p: number) => Math.min(pageCount, p + 1))}>التالي ←</button>
        </div>
      )}
    </div>
  );
}

export default React.memo(AdminProducts);
