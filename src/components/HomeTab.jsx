import { memo, useState, useEffect, useMemo } from 'react';
import { BASE, imgFallback } from '../utils/constants';
import SearchResultsList from './SearchResultsList';
import ProductCard from './ProductCard';
import { useStore } from '../context/StoreContext';

const HomeTab = memo(({ products, addToCart, cart, searchQuery, setSearchQuery, setShowAllView }) => {
  const { instantResults, allProducts } = useStore();
  const [showBanner, setShowBanner] = useState(true);

  // Category sections with products
  const sectionCats = [
    { name: 'مواد غذائية', img: `${BASE}cat_canned.png`, fallback: '🥫' },
    { name: 'منظفات', img: `${BASE}cat_vegetables.jpg`, fallback: '🧹' },
    { name: 'إلكترونيات', img: `${BASE}cat_electronics.png`, fallback: '📱' },
    { name: 'أواني', img: `${BASE}cat_kitchen.png`, fallback: '🍳' },
    { name: 'مكسرات وبهارات', img: `${BASE}cat_canned.jpg`, fallback: '🥜' },
    { name: 'خضروات وفواكه', img: `${BASE}Getty.webp`, fallback: '🥦' },
    { name: 'ألعاب', img: `${BASE}cat_toys.png`, fallback: '🎮' },
    { name: 'مجموعة الأصناف', img: `${BASE}cat_dairy.jpg`, fallback: '📦' },
    { name: 'ملابس', img: `${BASE}cat_clothing.png`, fallback: '👕' },
    { name: 'مواد البناء', img: `${BASE}cat_hardware.png`, fallback: '🔧' },
  ];


  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="home-tab-container">
      {/* Search Bar */}
      <div className="home-search-bar">
        <div className="app-search-bar">
          <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" className="app-search-input" placeholder="ابحث عن منتج..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off" />
          {isSearching && (
            <button className="all-products-search-clear" onClick={() => setSearchQuery('')} aria-label="مسح">✕</button>
          )}
        </div>
      </div>

      {isSearching ? (
        <SearchResultsList results={instantResults} addToCart={addToCart} cart={cart} searchQuery={searchQuery} />
      ) : (
        <>
          {/* Hero Banner */}
          {showBanner && (
            <div className="hero-banner-new">
              <img src={`${BASE}123.jpg`} alt="عروض حصرية" className="hero-banner-img-full" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}

          {/* Scrolling Categories Ticker */}
          <div className="categories-ticker-container">
            <div className="categories-ticker-track">
              {[...sectionCats, ...sectionCats].map((cat, idx) => (
                <div key={cat.name + '-' + idx} className="categories-ticker-item" onClick={() => setShowAllView(cat.name)}>
                  <img 
                    src={cat.img} 
                    alt={cat.name} 
                    className="ticker-item-img" 
                    onError={(e) => { 
                      e.target.style.display = 'none'; 
                      const icon = e.target.nextSibling;
                      if (icon) icon.style.display = 'inline-block';
                    }} 
                  />
                  <span className="ticker-item-icon" style={{ display: 'none' }}>{cat.fallback}</span>
                  <span className="ticker-item-name">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Offers Section */}
          <div className="home-section-card offers-card">
            <div className="section-card-header" onClick={() => setShowAllView('offers')}>
              <div className="section-card-title-group">
                <span className="section-card-icon">🔥</span>
                <h3 className="section-card-title">العروض المميزة اليومية</h3>
              </div>
              <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView('offers'); }}>عرض الكل</span>
            </div>
            <div className="all-products-grid">
              {(allProducts || []).filter(p => p.isOffer).slice(0, 6).map(product => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} cart={cart} />
              ))}
              {(allProducts || []).filter(p => p.isOffer).length === 0 && (
                <div className="no-products-card">
                  <p>لا توجد عروض حالياً</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Options */}
          <div className="home-section-card delivery-options-card">
            <div className="delivery-options-grid">
              <div className="delivery-option-item">
                <div className="delivery-option-info">
                  <h4>توصيل الطلبات</h4>
                  <p>توصيل مجاني للطلبات فوق ١٠٠ ر.س</p>
                </div>
                <img src={`${BASE}car.jpg`} alt="توصيل" className="delivery-option-img" onError={(e) => { e.target.style.display='none'; }} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default HomeTab;
