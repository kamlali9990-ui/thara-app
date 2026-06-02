import React, { useState, useRef, useCallback, useContext, useMemo } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { categories } from '../../data/mockData';
import { showToast } from '../Toast.jsx';
import * as XLSX from 'xlsx';
import CloudinaryUpload from './CloudinaryUpload';

const ADMIN_LOGO = (import.meta.env.BASE_URL || '/') + 'LOGO.jpg';

export default function AdminProducts({ staffRole, products, addProduct, updateProduct, deleteProduct }) {
  const isAdmin = staffRole === 'admin';
  const isManager = staffRole === 'manager';
  const canManageProducts = isAdmin || isManager;
  const { bulkImportProducts } = useContext(StoreContext);
  const [form, setForm] = useState({ name: '', category: categories.find(c => c !== 'الكل' && c !== 'العروض') || 'مواد غذائية', price: '', stock_quantity: '', unit: 'حبة', imageUrl: '' });
  const [showImport, setShowImport] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const fileInputRef = useRef(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState([]);
  const nameInputRef = useRef(null);

  // Search for similar products when typing name
  const searchSimilarProducts = (name) => {
    if (!name || name.length < 2) {
      setDuplicateProducts([]);
      setShowDuplicateWarning(false);
      return;
    }
    const searchTerm = name.toLowerCase().trim();
    const similar = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      searchTerm.includes(p.name.toLowerCase())
    ).slice(0, 5);
    setDuplicateProducts(similar);
    setShowDuplicateWarning(similar.length > 0);
  };

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'name') {
      searchSimilarProducts(value);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    // Check for exact duplicate
    const exactDuplicate = products.find(p => 
      p.name.toLowerCase().trim() === form.name.toLowerCase().trim()
    );
    if (exactDuplicate) {
      showToast('يوجد منتج بنفس الاسم بالفعل! يرجى استخدام اسم مختلف', 'error');
      return;
    }
    
    addProduct({
      name: form.name.trim(), category: form.category,
      price: Number(form.price) || 0, stock_quantity: Number(form.stock_quantity) || 0,
      imageUrl: form.imageUrl.trim() || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#127443" width="400" height="400"/><text fill="#FFFFFF" font-family="sans-serif" font-size="40" x="200" y="200" text-anchor="middle" dominant-baseline="middle">ثرا</text></svg>'),
      unit: form.unit.trim() || 'حبة', isOffer: false
    });
    setForm(prev => ({ ...prev, name: '', price: '', stock_quantity: '', imageUrl: '' }));
    setDuplicateProducts([]);
    setShowDuplicateWarning(false);
    showToast('تمت إضافة المنتج بنجاح', 'success');
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, category: product.category, price: product.price, stock_quantity: product.stock_quantity || 0, unit: product.unit || 'حبة', imageUrl: product.imageUrl || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (id) => {
    // Check for duplicate name when editing
    const duplicateWithName = products.find(p => 
      p.id !== id && p.name.toLowerCase().trim() === editForm.name.toLowerCase().trim()
    );
    if (duplicateWithName) {
      showToast('يوجد منتج آخر بنفس الاسم!', 'error');
      return;
    }
    
    try {
      await updateProduct(id, {
        name: editForm.name.trim(), category: editForm.category,
        price: Number(editForm.price) || 0, stock_quantity: Number(editForm.stock_quantity) || 0,
        unit: editForm.unit.trim() || 'حبة', imageUrl: editForm.imageUrl.trim()
      });
      showToast('تم حفظ التعديلات', 'success');
      setEditingId(null);
      setEditForm({});
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
      const rows = text.trim().split('\n').map((line, i) => {
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

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title products-title">إدارة المنتجات ({products.length})</h2>
        {canManageProducts && <button className="btn" onClick={() => { setShowImport(!showImport); setPreviewRows([]); }}>استيراد</button>}
      </div>

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
                          setForm(prev => ({ ...prev, name: p.name, category: p.category, price: p.price.toString(), unit: p.unit }));
                          setShowDuplicateWarning(false);
                          setDuplicateProducts([]);
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
                  {categories.filter(c => c !== 'الكل' && c !== 'العروض').map(c => <option key={c} value={c}>{c}</option>)}
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
              <div className="admin-product-field-group upload-field">
                <CloudinaryUpload 
                  onUpload={(url) => updateForm('imageUrl', url)} 
                  onError={(err) => showToast('فشل رفع الصورة', 'error')} 
                />
              </div>
              <button className="admin-product-add-btn" type="submit">+ إضافة</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-products-grid">
        {products.map(p => (
          <div key={p.id} className="admin-product-card">
            <img src={p.imageUrl} alt="" className="admin-product-img" onError={(e) => { if (e.target.src !== ADMIN_LOGO) e.target.src = ADMIN_LOGO; }} />
            {editingId === p.id ? (
              <div className="admin-edit-form">
                <div className="admin-edit-field">
                  <label className="admin-edit-label">اسم المنتج</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="admin-product-field" />
                </div>
                <div className="admin-edit-field">
                  <label className="admin-edit-label">القسم</label>
                  <select value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} className="admin-product-field">
                    {categories.filter(c => c !== 'الكل' && c !== 'العروض').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="admin-edit-row">
                  <div className="admin-edit-field">
                    <label className="admin-edit-label">السعر</label>
                    <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))} className="admin-edit-input" placeholder="السعر" />
                  </div>
                  <div className="admin-edit-field">
                    <label className="admin-edit-label">المخزون</label>
                    <input type="number" value={editForm.stock_quantity} onChange={e => setEditForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="admin-edit-input" placeholder="المخزون" />
                  </div>
                </div>
                <div className="admin-edit-row">
                  <div className="admin-edit-field">
                    <label className="admin-edit-label">الوحدة</label>
                    <input type="text" value={editForm.unit} onChange={e => setEditForm(prev => ({ ...prev, unit: e.target.value }))} className="admin-edit-input" placeholder="الوحدة" />
                  </div>
                  <div className="admin-edit-field">
                    <label className="admin-edit-label">الصورة</label>
                    <CloudinaryUpload 
                      onUpload={(url) => setEditForm(prev => ({ ...prev, imageUrl: url }))} 
                      onError={(err) => showToast('فشل رفع الصورة', 'error')} 
                    />
                  </div>
                </div>
                <div className="admin-edit-actions">
                  <button className="btn admin-edit-save-btn" onClick={() => saveEdit(p.id)}>💾 حفظ</button>
                  <button className="admin-delete-btn admin-edit-cancel-btn" onClick={cancelEdit}>❌ إلغاء</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <strong style={{ color: '#e2e8f0', fontSize: '0.9rem', flex: 1 }}>{p.name}</strong>
                  {canManageProducts && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button className="admin-edit-btn" onClick={() => startEdit(p)} title="تعديل">✏️</button>
                      <button className="admin-delete-btn" onClick={() => { if (window.confirm('حذف المنتج؟')) deleteProduct(p.id); }} title="حذف">🗑️</button>
                    </div>
                  )}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.2rem', width: '100%' }}>
                  {p.category} — {p.price?.toFixed(2)} ر.س | المخزون: {p.stock_quantity ?? 0} | {p.unit}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
