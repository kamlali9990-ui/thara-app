import { memo, useMemo, useState } from 'react';
import { productImgError } from '../utils/constants';
import { useStore } from '../context/StoreContext';
import { sectionCats } from '../data/categories';
import type { CartItem } from '../types';

const SearchResultsList = memo(({ results, addToCart, cart, searchQuery }: {
  results: any[];
  addToCart: (p: any) => void;
  cart: CartItem[];
  searchQuery: string;
}) => {
  const { updateCartQty, removeFromCart } = useStore();
  const [filterCat, setFilterCat] = useState('');

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    sectionCats.forEach((c: any) => { m[c.name] = c.color; });
    return m;
  }, []);

  const catList = useMemo(() => {
    const cats = [...new Set(results.map(p => p.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [results]);

  const filtered = useMemo(() => {
    if (!filterCat) return results;
    return results.filter(p => p.category === filterCat);
  }, [results, filterCat]);

  if (!searchQuery) return null;

  return (
    <div className="search-results-list">
      <div className="search-results-count">{filtered.length} نتيجة لـ "{searchQuery}"</div>
      {catList.length > 1 && (
        <div className="search-filter-cats">
          <button className={`search-filter-pill ${!filterCat ? 'active' : ''}`} onClick={() => setFilterCat('')}>الكل</button>
          {catList.map(cat => (
            <button key={cat} className={`search-filter-pill ${filterCat === cat ? 'active' : ''}`}
              style={{ '--pill-color': catMap[cat] || '#127443' } as React.CSSProperties}
              onClick={() => setFilterCat(cat === filterCat ? '' : cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 && (
        <div className="search-results-empty">لا توجد منتجات تطابق بحثك</div>
      )}
      {filtered.map(product => {
        const cartItem = cart?.find(item => item.id === product.id);
        const cartQty = cartItem?.qty || 0;
        const outOfStock = product.stock_quantity === 0;
        return (
          <div key={product.id} className={`search-result-item ${outOfStock ? 'out-of-stock' : ''}`} style={{ gap: '1rem' }}>
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              onError={productImgError} 
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'cover',
                borderRadius: '8px',
                flexShrink: 0,
                background: 'rgba(0,0,0,0.05)'
              }}
              loading="lazy"
            />
            <div className="search-result-info">
              <div className="search-result-name">{product.name}</div>
              <div className="search-result-meta">
                <span className="search-result-category">{product.category}</span>
                {product.unit && <span className="search-result-unit">/{product.unit}</span>}
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
  );
});

export default SearchResultsList;
