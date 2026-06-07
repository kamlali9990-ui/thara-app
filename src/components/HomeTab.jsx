import { memo, useState, useEffect, useMemo } from 'react';
import { BASE, imgFallback } from '../utils/constants';
import SearchResultsList from './SearchResultsList';
import ProductCard from './ProductCard';
import { useStore } from '../context/StoreContext';
import { sectionCats } from '../data/categories';
import { supabase } from '../supabase/client';

const BANNER_STORAGE_KEY = 'thara_banner_url';
const DEFAULT_BANNER = `${BASE}123.jpg`;

const HomeTab = memo(({ products, addToCart, cart, searchQuery, setSearchQuery, setShowAllView }) => {
  const { instantResults, allProducts } = useStore();
  const [showBanner, setShowBanner] = useState(true);
  const [bannerSrc, setBannerSrc] = useState(() => {
    try { return localStorage.getItem(BANNER_STORAGE_KEY) || DEFAULT_BANNER; } catch { return DEFAULT_BANNER; }
  });

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'banner_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          localStorage.setItem(BANNER_STORAGE_KEY, data.value);
          setBannerSrc(data.value);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      const src = localStorage.getItem(BANNER_STORAGE_KEY) || DEFAULT_BANNER;
      setBannerSrc(src);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('thara:banner-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('thara:banner-changed', handler);
    };
  }, []);


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
              <img src={bannerSrc} alt="عروض حصرية" className="hero-banner-img-full" onError={(e) => { e.target.src = `${BASE}123.jpg`; }} />
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

          {/* Offers Section - Horizontal Ticker */}
          <div className="offers-ticker-container">
            <div className="offers-ticker-header" onClick={() => setShowAllView('offers')}>
              <div className="section-card-title-group">
                <span className="section-card-icon">🔥</span>
                <h3 className="section-card-title">العروض المميزة اليومية</h3>
              </div>
              <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView('offers'); }}>عرض الكل</span>
            </div>
            <div className="offers-ticker-track">
              {(allProducts || []).filter(p => p.isOffer).length > 0 ? 
                [...(allProducts || []).filter(p => p.isOffer), ...(allProducts || []).filter(p => p.isOffer)].slice(0, 12).map((product, idx) => (
                <div key={product.id + '-offer-' + idx} className="offer-ticker-item">
                  <div className="offer-ticker-img-wrap">
                    {product.isOffer && <span className="offer-ticker-badge">%</span>}
                    <img src={product.imageUrl} alt={product.name} className="offer-ticker-img" 
                      onError={(e) => { e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#127443" width="100" height="100"/><text fill="#FFF" font-family="sans-serif" font-size="20" x="50" y="55" text-anchor="middle">ثرا</text></svg>'); }} />
                  </div>
                  <div className="offer-ticker-info">
                    <div className="offer-ticker-name">{product.name}</div>
                    <div className="offer-ticker-price">
                      {product.offerPrice ? (
                        <><span className="offer-ticker-old-price">{(product.price || 0).toFixed(2)}</span> {(product.offerPrice || 0).toFixed(2)}</>
                      ) : (product.price || 0).toFixed(2)}
                      <span className="offer-ticker-currency"> ر.س</span>
                    </div>
                    <button className="offer-ticker-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>+</button>
                  </div>
                </div>
              )) : (
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

          {/* Install Guide Card */}
          <div className="home-section-card share-app-card" onClick={() => window.open('/install-guide.html', '_blank')} role="button" tabIndex={0} style={{background:'linear-gradient(135deg,#fefce8,#fef9c3)'}}>
            <div className="share-app-inner">
              <div className="share-app-info">
                <h4>📱 كيف تثبت التطبيق على iPhone؟</h4>
                <p>6 خطوات بالصور — حول الموقع إلى تطبيق على شاشتك الرئيسية</p>
              </div>
              <div className="share-app-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#127443" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10M9 9l3 3 3-3"/><path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/></svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default HomeTab;
