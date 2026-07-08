import { memo, useState, useMemo, useEffect } from 'react';
import { BASE } from '../utils/constants';
import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';
import RotatingCategoryRow from './RotatingCategoryRow';
import Breadcrumb from './Breadcrumb';

import { sectionCats, getCategoryImg, specialSections } from '../data/categories';
import type { Product, CartItem } from '../types';

interface CategoriesTabProps {
  setShowAllView: (view: string) => void;
  preselectedCat: any;
  setPreselectedCat: (cat: any) => void;
}

const CategoriesTab = memo<CategoriesTabProps>(({ setShowAllView, preselectedCat, setPreselectedCat }) => {
  const { allProducts, addToCart, cart, updateCartQty, removeFromCart, mostRequested } = useStore();
  const allCats = sectionCats;

  const [catSearch, setCatSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [prodSearch, setProdSearch] = useState('');

  const filtered = useMemo(() => {
    if (!catSearch.trim()) return allCats;
    const q = catSearch.trim().toLowerCase();
    return allCats.filter(c => c.name.includes(q) || c.desc.includes(q));
  }, [catSearch, allCats]);

  const isProdSearching = prodSearch.trim().length > 0;

  const categoryProducts = useMemo(() => {
    if (!selectedCat) return [];
    return (allProducts || []).filter(p => p.category === selectedCat.name);
  }, [selectedCat, allProducts]);

  const prodFiltered = useMemo(() => {
    if (!selectedCat) return [];
    const base = (allProducts || []).filter(p => p.category === selectedCat.name);
    if (!prodSearch.trim()) return base;
    const q = prodSearch.trim().toLowerCase();
    return base.filter(p => p.name.includes(q));
  }, [selectedCat, allProducts, prodSearch]);

  useEffect(() => {
    if (preselectedCat) {
      setSelectedCat(preselectedCat);
      setProdSearch('');
      setPreselectedCat(null);
    }
  }, [preselectedCat, setPreselectedCat]);

  const selectCat = (cat: any) => {
    setSelectedCat(cat);
    setProdSearch('');
  };

  if (selectedCat) {
    return (
      <div className="categories-tab">
        <div className="all-products-header">
          <button className="all-products-back" onClick={() => setSelectedCat(null)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="all-products-title">{selectedCat.name}</h2>
        </div>
        <Breadcrumb items={[
          { label: 'تصفح الأقسام', onClick: () => setSelectedCat(null) },
          { label: selectedCat.name }
        ]} />
        <div className="all-products-search">
          <svg className="all-products-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" className="all-products-search-input" placeholder="ابحث عن منتج..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
          {prodSearch && <button className="all-products-search-clear" onClick={() => setProdSearch('')} aria-label="مسح">✕</button>}
        </div>
        {isProdSearching ? (
          <div className="search-results-list">
            <div className="search-results-count">{prodFiltered.length} نتيجة لـ "{prodSearch}"</div>
            {prodFiltered.length === 0 && (
              <div className="search-results-empty">لا توجد منتجات تطابق بحثك</div>
            )}
            {prodFiltered.map(product => {
              const cartItem = cart?.find((item: CartItem) => item.id === product.id);
              const cartQty = cartItem?.qty || 0;
              const outOfStock = product.stock_quantity === 0;
              return (
                <div key={product.id} className={`search-result-item ${outOfStock ? 'out-of-stock' : ''}`}>
                  <div className="search-result-info">
                    <div className="search-result-name">{product.name}</div>
                    <div className="search-result-meta">
                      <span className="search-result-unit">{product.unit ? `/${product.unit}` : ''}</span>
                    </div>
                    <div className="search-result-price-row">
                      <span className="search-result-price">
                        {product.isOffer && product.offerPrice != null ? (
                          <><span className="offer-old">{product.price.toFixed(2)}</span> {product.offerPrice.toFixed(2)}</>
                        ) : product.price.toFixed(2)}
                        <span className="currency"> ر.س</span>
                      </span>
                      {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                        <span className="search-result-low-stock">بقية {product.stock_quantity}</span>
                      )}
                    </div>
                  </div>
                  <div className="search-result-action">
                    {outOfStock ? (
                      <span className="search-result-out-label">نفذ</span>
                    ) : cartQty > 0 ? (
                      <div className="search-result-qty-row">
                        <button className="search-result-qty-btn" onClick={(e) => { e.stopPropagation(); if (cartQty <= 1) { removeFromCart(product.id); } else { updateCartQty(product.id, -1); } }} aria-label="تقليل">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <span className="search-result-qty-num">{cartQty}</span>
                        <button className="search-result-qty-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }} aria-label="زيادة">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button className="search-result-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <span className="search-result-add-text">أضف لسلتك</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="categories-tab-products">
            <RotatingCategoryRow
              category={selectedCat.name}
              categoryColor={selectedCat.color}
              allProducts={categoryProducts}
              mostRequested={mostRequested}
              addToCart={addToCart}
              cart={cart}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="categories-tab">
      <h2 className="categories-tab-title">تصفح الأقسام</h2>
      <div className="cat-search-wrap">
        <svg className="cat-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="cat-search-input" placeholder="ابحث عن قسم..." value={catSearch} onChange={e => setCatSearch(e.target.value)} />
        {catSearch && <button className="cat-search-clear" onClick={() => setCatSearch('')} aria-label="مسح">✕</button>}
      </div>
      <div className="categories-tab-grid">
        {!catSearch.trim() && (
          (() => {
            const offersCat = specialSections[0];
            const offersImg = getCategoryImg(offersCat);
            return (
              <button className="category-tab-card" style={{ backgroundColor: offersCat.color, '--cat-color': offersCat.color } as any} onClick={() => setShowAllView('offers')}>
                <img src={offersImg} alt={offersCat.name} className="category-tab-img" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <span className="category-tab-emoji" style={{ display: 'none' }}>{offersCat.fallback}</span>
                <span className="category-tab-name">{offersCat.name}</span>
                <span className="category-tab-desc">{offersCat.desc}</span>
              </button>
            );
          })()
        )}
        {filtered.length ? filtered.map(cat => (
          <button key={cat.name} className="category-tab-card" style={{ backgroundColor: cat.color, '--cat-color': cat.color } as any} onClick={() => selectCat(cat)}>
            <img src={getCategoryImg(cat)} alt={cat.name} className="category-tab-img" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <span className="category-tab-emoji" style={{ display: 'none' }}>{cat.fallback}</span>
            <span className="category-tab-name">{cat.name}</span>
            <span className="category-tab-desc">{cat.desc}</span>
          </button>
        )) : <p className="cat-search-empty">لا توجد أقسام تطابق بحثك</p>}
      </div>
    </div>
  );
});

export default CategoriesTab;
