import React, { useState, useMemo, useCallback } from 'react';

const CAT_ORDER = ['مواد غذائية', 'منظفات', 'إلكترونيات', 'أواني', 'مكسرات وبهارات', 'خضروات وفواكه', 'ألعاب', 'مجموعة الأصناف', 'ملابس', 'مواد البناء'];
const CAT_COLORS = {
  'مواد غذائية': '#f59e0b', 'منظفات': '#10b981', 'إلكترونيات': '#3b82f6',
  'أواني': '#ef4444', 'مكسرات وبهارات': '#a855f7', 'خضروات وفواكه': '#22c55e',
  'ألعاب': '#ec4899', 'مجموعة الأصناف': '#64748b', 'ملابس': '#06b6d4', 'مواد البناء': '#f97316'
};

export default function AdminOffers({ staffRole, products, updateProduct }) {
  const isAdmin = staffRole === 'admin';
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(new Set());
  const [editPrices, setEditPrices] = useState({});

  const cats = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      set.add(p.category);
    });
    return CAT_ORDER.filter(c => set.has(c)).concat([...set].filter(c => !CAT_ORDER.includes(c)));
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter) {
      list = list.filter(p => p.category === catFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, catFilter, search]);

  const activeOffers = useMemo(() => products.filter(p => p.isOffer), [products]);

  const handleToggle = useCallback(async (product) => {
    if (saving.has(product.id)) return;
    setSaving(prev => new Set(prev).add(product.id));
    try {
      await updateProduct(product.id, { isOffer: !product.isOffer, offerPrice: product.isOffer ? null : (product.offerPrice || product.price) });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  }, [updateProduct, saving]);

  const handleSavePrice = useCallback(async (productId) => {
    if (editPrices[productId] === undefined) return;
    if (saving.has(productId)) return;
    setSaving(prev => new Set(prev).add(productId));
    try {
      await updateProduct(productId, { offerPrice: editPrices[productId] });
      setEditPrices(prev => { const n = { ...prev }; delete n[productId]; return n; });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(productId); return n; });
    }
  }, [updateProduct, saving, editPrices]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const batchRemoveOffers = async () => {
    for (const id of selected) {
      const p = products.find(x => x.id === id);
      if (p?.isOffer) {
        await updateProduct(id, { isOffer: false, offerPrice: null });
      }
    }
    setSelected(new Set());
  };

  return (
    <div className="admin-offers">
      <div className="admin-offers-header">
        <div>
          <h2 className="admin-section-title offers-title">إدارة العروض الخاصة</h2>
          <p className="admin-section-desc">
            العروض النشطة: <strong>{activeOffers.length}</strong> من أصل {products.length} منتج
          </p>
        </div>
        {isAdmin && selected.size > 0 && (
          <button className="btn btn-danger" onClick={batchRemoveOffers}>
            إلغاء العروض عن ({selected.size})
          </button>
        )}
      </div>

      <div className="admin-offers-toolbar">
        <select className="admin-offers-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">كل الأقسام</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="admin-offers-search-wrap">
          <input type="text" className="admin-offers-search" placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="admin-offers-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      <div className="admin-offers-list">
        {filtered.length === 0 && (
          <div className="admin-offers-empty">لا توجد منتجات تطابق بحثك</div>
        )}
        {filtered.map(product => {
          const group = product.category;
          const color = CAT_COLORS[group] || '#64748b';
          const isSaving = saving.has(product.id);
          const hasPriceEdit = editPrices[product.id] !== undefined;
          return (
            <div key={product.id} className={`admin-offer-row ${product.isOffer ? 'is-offer' : ''}`}>
              {isAdmin && (
                <label className="admin-offer-checkbox" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} />
                </label>
              )}
              <span className="admin-offer-cat-badge" style={{ background: color }}>{group}</span>
              <img src={product.imageUrl} className="admin-offer-img" onError={e => { e.target.style.display = 'none'; }} />
              <div className="admin-offer-info">
                <div className="admin-offer-name">{product.name}</div>
                <div className="admin-offer-category">{product.category}</div>
                <div className="admin-offer-price">السعر الأصلي: {product.price.toFixed(2)} ر.س</div>
              </div>
              {isAdmin && (
                <div className="admin-offer-actions">
                  <button
                    className={`admin-offer-toggle ${product.isOffer ? 'active' : ''}`}
                    onClick={() => handleToggle(product)}
                    disabled={isSaving}
                  >
                    {isSaving ? '...' : product.isOffer ? 'ضمن العروض ✓' : 'تفعيل العرض'}
                  </button>
                  {product.isOffer && (
                    <div className="admin-offer-price-edit">
                      <input
                        type="number"
                        className="admin-offer-input"
                        value={hasPriceEdit ? editPrices[product.id] : (product.offerPrice || '')}
                        onChange={e => setEditPrices(prev => ({ ...prev, [product.id]: parseFloat(e.target.value) || 0 }))}
                        placeholder="سعر العرض"
                      />
                      {hasPriceEdit && (
                        <button className="admin-offer-save-btn" onClick={() => handleSavePrice(product.id)} disabled={isSaving}>
                          {isSaving ? '...' : 'حفظ'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
