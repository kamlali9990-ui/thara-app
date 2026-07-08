import React, { useState, useMemo, useCallback } from 'react';
import { showToast } from '../Toast';
import type { Product } from '../../types';

const CAT_ORDER = ['مواد غذائية', 'منظفات', 'إلكترونيات', 'أواني', 'مكسرات وبهارات', 'خضروات وفواكه', 'ألعاب', 'مجموعة الأصناف', 'ملابس', 'مواد البناء'];
const CAT_COLORS: Record<string, string> = {
  'مواد غذائية': '#f59e0b', 'منظفات': '#10b981', 'إلكترونيات': '#3b82f6',
  'أواني': '#ef4444', 'مكسرات وبهارات': '#a855f7', 'خضروات وفواكه': '#22c55e',
  'ألعاب': '#ec4899', 'مجموعة الأصناف': '#64748b', 'ملابس': '#06b6d4', 'مواد البناء': '#f97316'
};

export default function AdminOffers({ staffRole, products, updateProduct }: {
  staffRole: string;
  products: Product[];
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
}) {
  const isAdmin = staffRole === 'admin';
  const isManager = staffRole === 'manager';
  const canManageOffers = isAdmin || isManager;
  
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [editPrices, setEditPrices] = useState<Record<number, string>>({});

  // Active offers (isOffer = true)
  const activeOffers = useMemo(() => products.filter(p => p.isOffer), [products]);

  // Products available to add (not in offers yet)
  const availableProducts = useMemo(() => {
    let list = products.filter(p => !p.isOffer);
    if (addSearch.trim()) {
      const q = addSearch.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }
    return list.slice(0, 50);
  }, [products, addSearch]);

  // Filter active offers by search
  const filteredOffers = useMemo(() => {
    if (!search.trim()) return activeOffers;
    const q = search.trim().toLowerCase();
    return activeOffers.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
  }, [activeOffers, search]);

  const notifyOfferAdded = (product: Product) => {
    const evt = new CustomEvent('thara:new-offer', { detail: { name: product.name, price: product.offerPrice || product.price, image: (product as any).imageUrl } });
    window.dispatchEvent(evt);
    showToast(`🔥 عرض جديد: ${product.name}!`, 'success');
  };

  const handleToggle = useCallback(async (product: Product) => {
    if (saving.has(product.id)) return;
    setSaving(prev => new Set(prev).add(product.id));
    try {
      const wasOffer = product.isOffer;
      await updateProduct(product.id, { isOffer: !wasOffer, offerPrice: wasOffer ? null : (product.offerPrice || product.price) } as any);
      if (!wasOffer) notifyOfferAdded(product);
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  }, [updateProduct, saving]);

  const handleAddToOffers = useCallback(async (product: Product) => {
    if (saving.has(product.id)) return;
    setSaving(prev => new Set(prev).add(product.id));
    try {
      await updateProduct(product.id, { isOffer: true, offerPrice: product.offerPrice || product.price } as any);
      notifyOfferAdded(product);
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  }, [updateProduct, saving]);

  const handleSavePrice = useCallback(async (productId: number) => {
    if (editPrices[productId] === undefined) return;
    if (saving.has(productId)) return;
    setSaving(prev => new Set(prev).add(productId));
    try {
      await updateProduct(productId, { offerPrice: Number(editPrices[productId]) } as any);
      setEditPrices(prev => { const n = { ...prev }; delete n[productId]; return n; });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(productId); return n; });
    }
  }, [updateProduct, saving, editPrices]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const batchRemoveOffers = async () => {
    for (const id of selected) {
      const p = products.find(x => x.id === id);
      if (p?.isOffer) {
        await updateProduct(id, { isOffer: false, offerPrice: null } as any);
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
        <div className="admin-offers-header-actions">
          {canManageOffers && selected.size > 0 && (
            <button className="btn btn-danger" onClick={batchRemoveOffers}>
              إلغاء العروض عن ({selected.size})
            </button>
          )}
          {canManageOffers && (
            <button className="btn btn-primary" onClick={() => setShowAddProduct(!showAddProduct)}>
              {showAddProduct ? 'إغلاق' : '+ إضافة منتج للعروض'}
            </button>
          )}
        </div>
      </div>

      {/* Search active offers */}
      <div className="admin-offers-toolbar">
        <div className="admin-offers-search-wrap">
          <input type="text" className="admin-offers-search" placeholder="🔍 ابحث في العروض النشطة..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="admin-offers-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Add product to offers section */}
      {showAddProduct && canManageOffers && (
        <div className="admin-offers-add-section">
          <h3 className="admin-offers-add-title">🔍 ابحث عن منتج لإضافته للعروض</h3>
          <div className="admin-offers-search-wrap">
            <input type="text" className="admin-offers-search" placeholder="اكتب اسم المنتج..." value={addSearch} onChange={e => setAddSearch(e.target.value)} />
            {addSearch && <button className="admin-offers-search-clear" onClick={() => setAddSearch('')}>✕</button>}
          </div>
          <div className="admin-offers-add-list">
            {availableProducts.length === 0 && (
              <div className="admin-offers-empty">لا توجد منتجات متاحة</div>
            )}
            {availableProducts.map(product => {
              const isSaving = saving.has(product.id);
              return (
                <div key={product.id} className="admin-offer-row add-mode">
                  <img src={(product as any).imageUrl} className="admin-offer-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="admin-offer-info">
                    <div className="admin-offer-name">{product.name}</div>
                    <div className="admin-offer-category">{product.category}</div>
                    <div className="admin-offer-price">{product.price.toFixed(2)} ر.س</div>
                  </div>
                  <button
                    className="admin-offer-add-btn"
                    onClick={() => handleAddToOffers(product)}
                    disabled={isSaving}
                  >
                    {isSaving ? '...' : '+ إضافة'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active offers list */}
      <div className="admin-offers-list">
        <h3 className="admin-offers-list-title">🔥 العروض النشطة ({filteredOffers.length})</h3>
        {filteredOffers.length === 0 && (
          <div className="admin-offers-empty">
            {search ? 'لا توجد عروض تطابق بحثك' : 'لا توجد عروض حالياً. أضف منتجات للعروض!'}
          </div>
        )}
        {filteredOffers.map(product => {
          const group = product.category || '';
          const color = CAT_COLORS[group] || '#64748b';
          const isSaving = saving.has(product.id);
          const hasPriceEdit = editPrices[product.id] !== undefined;
          return (
            <div key={product.id} className="admin-offer-row is-offer">
              {canManageOffers && (
                <label className="admin-offer-checkbox" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} />
                </label>
              )}
              <span className="admin-offer-cat-badge" style={{ background: color }}>{group}</span>
              <img src={(product as any).imageUrl} className="admin-offer-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="admin-offer-info">
                <div className="admin-offer-name">{product.name}</div>
                <div className="admin-offer-category">{product.category}</div>
                <div className="admin-offer-price">السعر الأصلي: {product.price.toFixed(2)} ر.س</div>
              </div>
              {canManageOffers && (
                <div className="admin-offer-actions">
                  <div className="admin-offer-price-edit">
                    <label className="admin-offer-price-label">سعر العرض:</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="admin-offer-input"
                      value={hasPriceEdit ? editPrices[product.id] : (product.offerPrice || '')}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        setEditPrices(prev => ({ ...prev, [product.id]: v === '' ? '' : v }));
                      }}
                      placeholder="سعر العرض"
                    />
                    {hasPriceEdit && (
                      <button className="admin-offer-save-btn" onClick={() => handleSavePrice(product.id)} disabled={isSaving}>
                        {isSaving ? '...' : '💾 حفظ'}
                      </button>
                    )}
                  </div>
                  <button
                    className="admin-offer-remove-btn"
                    onClick={() => handleToggle(product)}
                    disabled={isSaving}
                  >
                    {isSaving ? '...' : '❌ إزالة من العروض'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
