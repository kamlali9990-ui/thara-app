import { memo, useState, useMemo } from 'react';
import { BASE } from '../utils/constants';
import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';

const CategoriesTab = memo(({ setShowAllView, onTabChange }) => {
  const { allProducts, addToCart, cart } = useStore();
  const allCats = useMemo(() => [
    { name: 'مواد غذائية', img: `${BASE}cat_canned.png`, fallback: '🥫', desc: 'جميع المواد الغذائية' },
    { name: 'منظفات', img: `${BASE}cat_vegetables.jpg`, fallback: '🧹', desc: 'منتجات التنظيف والعناية' },
    { name: 'إلكترونيات', img: `${BASE}cat_electronics.png`, fallback: '📱', desc: 'أجهزة وإكسسوارات إلكترونية' },
    { name: 'أواني', img: `${BASE}cat_kitchen.png`, fallback: '🍳', desc: 'أدوات المطبخ والمنزل' },
    { name: 'مكسرات وبهارات', img: `${BASE}cat_canned.jpg`, fallback: '🥜', desc: 'مكسرات وبهارات وتوابل' },
    { name: 'خضروات وفواكه', img: `${BASE}Getty.webp`, fallback: '🥦', desc: 'طازج من المزرعة' },
    { name: 'ألعاب', img: `${BASE}cat_toys.png`, fallback: '🎮', desc: 'ألعاب وترفيه للأطفال' },
    { name: 'مجموعة الأصناف', img: `${BASE}cat_dairy.jpg`, fallback: '📦', desc: 'منتجات متنوعة' },
    { name: 'ملابس', img: `${BASE}cat_clothing.png`, fallback: '👕', desc: 'ملابس للجميع' },
    { name: 'مواد البناء', img: `${BASE}cat_hardware.png`, fallback: '🔧', desc: 'أدوات البناء والسباكة والكهرباء' },
  ], [BASE]);

  const [catSearch, setCatSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [prodSearch, setProdSearch] = useState('');

  const filtered = useMemo(() => {
    if (!catSearch.trim()) return allCats;
    const q = catSearch.trim().toLowerCase();
    return allCats.filter(c => c.name.includes(q) || c.desc.includes(q));
  }, [catSearch, allCats]);

  const isProdSearching = prodSearch.trim().length > 0;

  const categoryProducts = useMemo(() => {
    if (!selectedCat) return [];
    return (allProducts || []).filter(p => p.category === selectedCat.name).slice(0, 6);
  }, [selectedCat, allProducts]);

  const prodFiltered = useMemo(() => {
    if (!selectedCat) return [];
    const base = (allProducts || []).filter(p => p.category === selectedCat.name);
    if (!prodSearch.trim()) return base.slice(0, 6);
    const q = prodSearch.trim().toLowerCase();
    return base.filter(p => p.name.includes(q));
  }, [selectedCat, allProducts, prodSearch]);

  const selectCat = (cat) => {
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
              const cartItem = cart?.find(item => item.id === product.id);
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
                        {product.isOffer ? (
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
            {prodFiltered.map(product => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} cart={cart} />
            ))}
            {prodFiltered.length === 0 && (
              <div className="no-products-card" style={{ gridColumn: '1 / -1' }}>
                <p>لا توجد منتجات في هذا القسم</p>
              </div>
            )}
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
        {filtered.length ? filtered.map(cat => (
          <button key={cat.name} className="category-tab-card" onClick={() => selectCat(cat)}>
            <img src={cat.img} alt={cat.name} className="category-tab-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
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
