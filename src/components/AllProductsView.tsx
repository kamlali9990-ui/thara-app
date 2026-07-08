import { memo, useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import Breadcrumb from './Breadcrumb';
import { useStore } from '../context/StoreContext';
import { sectionCats } from '../data/categories';
import type { Product, CartItem } from '../types';

const PAGE_SIZE = 20;

interface AllProductsViewProps {
  view: string;
  onBack: () => void;
  products: Product[];
  addToCart: (product: Product) => void;
  cart: CartItem[];
}

const AllProductsView = memo<AllProductsViewProps>(({ view, onBack, products, addToCart, cart }) => {
  const { updateCartQty, removeFromCart } = useStore();
  const catNames = sectionCats.map(c => c.name);
  const title = view === 'offers' ? 'العروض المميزة' : view === 'top-stock' ? 'تشكيلة مميزة' : view === 'bestsellers' ? 'الأكثر مبيعا' : catNames.includes(view) ? view : 'جميع المنتجات';
  const [catSearch, setCatSearch] = useState('');
  const isSearching = catSearch.trim().length > 0;
  const filtered = useMemo(() => {
    let base: Product[];
    if (view === 'offers') base = products.filter(p => p.isOffer);
    else if (view === 'top-stock') base = [...products].sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0)).slice(0, 100);
    else if (view === 'bestsellers') base = products.slice(0, 12);
    else if (catNames.includes(view)) base = products.filter(p => p.category === view);
    else base = products;
    if (!catSearch.trim()) return base;
    const q = catSearch.trim().toLowerCase();
    return base.filter(p => p.name.includes(q));
  }, [view, products, catSearch]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleProducts = filtered.slice(0, visibleCount);
  return (
    <div className="all-products-view">
      <div className="all-products-header">
        <button className="all-products-back" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="all-products-title">{title}</h2>
      </div>
        <Breadcrumb items={[
          { label: title, onClick: onBack }
        ]} />
        <div className="all-products-search">
        <svg className="all-products-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="all-products-search-input" placeholder="ابحث عن منتج..." value={catSearch} onChange={e => setCatSearch(e.target.value)} />
        {catSearch && <button className="all-products-search-clear" onClick={() => setCatSearch('')} aria-label="مسح">✕</button>}
      </div>
      {isSearching ? (
        <div className="search-results-list">
          <div className="search-results-count">{filtered.length} نتيجة لـ "{catSearch}"</div>
          {filtered.length === 0 && (
            <div className="search-results-empty">لا توجد منتجات تطابق بحثك</div>
          )}
          {visibleProducts.map(product => {
            const cartItem = cart?.find(item => item.id === product.id);
            const cartQty = cartItem?.qty || 0;
            const outOfStock = product.stock_quantity === 0;
            return (
              <div key={product.id} className={`search-result-item ${outOfStock ? 'out-of-stock' : ''}`}>
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
      ) : (
        <div className={`all-products-grid ${view === 'offers' ? 'offers-grid' : ''}`}>
          {visibleProducts.map(product => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} cart={cart} />
          ))}
          {filtered.length === 0 && (
            <div className="no-products-card" style={{ gridColumn: '1 / -1' }}>
              <p>لا توجد منتجات</p>
            </div>
          )}
        </div>
      )}
      {filtered.length > visibleCount && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <button className="load-more-btn" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
            تحميل المزيد ({filtered.length - visibleCount} متبقي)
          </button>
        </div>
      )}
    </div>
  );
});

export default AllProductsView;
