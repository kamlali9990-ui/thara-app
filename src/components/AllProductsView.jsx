import { memo, useState, useMemo } from 'react';
import ProductCard from './ProductCard';

const AllProductsView = memo(({ view, onBack, products, addToCart, cart }) => {
  const catNames = ['مواد غذائية', 'منظفات', 'إلكترونيات', 'أواني', 'مكسرات وبهارات', 'خضروات وفواكه', 'ألعاب', 'مجموعة الأصناف', 'ملابس', 'مواد البناء'];
  const title = view === 'offers' ? 'العروض المميزة' : view === 'bestsellers' ? 'الأكثر مبيعا' : catNames.includes(view) ? view : 'جميع المنتجات';
  const [catSearch, setCatSearch] = useState('');
  const isSearching = catSearch.trim().length > 0;
  const filtered = useMemo(() => {
    let base;
    if (view === 'offers') base = products.filter(p => p.isOffer);
    else if (view === 'bestsellers') base = products.slice(0, 12);
    else if (catNames.includes(view)) base = products.filter(p => p.category === view);
    else base = products;
    if (!catSearch.trim()) return base;
    const q = catSearch.trim().toLowerCase();
    return base.filter(p => p.name.includes(q));
  }, [view, products, catSearch]);
  return (
    <div className="all-products-view">
      <div className="all-products-header">
        <button className="all-products-back" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="all-products-title">{title}</h2>
      </div>
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
          {filtered.map(product => {
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
                  ) : (
                    <button className="search-result-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                      {cartQty > 0 && <span className="search-result-cart-qty">{cartQty}</span>}
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
        <div className="all-products-grid">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} cart={cart} />
          ))}
          {filtered.length === 0 && (
            <div className="no-products-card" style={{ gridColumn: '1 / -1' }}>
              <p>لا توجد منتجات</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AllProductsView;
