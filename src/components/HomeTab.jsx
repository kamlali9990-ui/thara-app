import { memo, useState, useEffect, useMemo } from 'react';
import { BASE } from '../utils/constants';
import { useStore } from '../context/StoreContext';
import { sectionCats } from '../data/categories';
import { supabase } from '../supabase/client';
import { PHONE, WHATSAPP_NUM, EMAIL_1, SNAPCHAT } from '../utils/constants';
import { SkeletonProductCard } from './SkeletonLoader';

const BANNER_STORAGE_KEY = 'thara_banner_url';

function isValidBannerUrl(url) {
  if (!url) return false;
  if (url.startsWith('http')) return true;
  if (url.startsWith(BASE)) return true;
  return false;
}

const HomeTab = memo(({ addToCart, cart, searchQuery, setSearchQuery, setShowAllView }) => {
  const { instantResults, allProducts, loading } = useStore();
  const [showBanner, setShowBanner] = useState(true);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const [bannerSrc, setBannerSrc] = useState(() => {
    try {
      const stored = localStorage.getItem(BANNER_STORAGE_KEY);
      if (isValidBannerUrl(stored)) return stored;
      return '';
    } catch { return ''; }
  });
  const [featuredVer, setFeaturedVer] = useState(0);

  useEffect(() => {
    const h = () => setFeaturedVer(v => v + 1);
    window.addEventListener('thara:featured-changed', h);
    return () => window.removeEventListener('thara:featured-changed', h);
  }, []);

  const topStock = useMemo(() => {
    const all = allProducts || [];
    try {
      const ids = JSON.parse(localStorage.getItem('thara_featured_ids') || '[]');
      if (ids.length > 0) {
        const featured = all.filter(p => ids.includes(p.id));
        if (featured.length > 0) return featured;
      }
    } catch {}
    return [...all].sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0)).slice(0, 8);
  }, [allProducts, featuredVer]);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'banner_url')
      .maybeSingle()
      .then(({ data }) => {
        const val = data?.value;
        if (isValidBannerUrl(val)) {
          localStorage.setItem(BANNER_STORAGE_KEY, val);
          setBannerSrc(val);
        }
      })
      .catch((e) => console.error('[banner fetch]', e));
  }, []);

  useEffect(() => {
    const handler = () => {
      const src = localStorage.getItem(BANNER_STORAGE_KEY) || '';
      setBannerSrc(src);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('thara:banner-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('thara:banner-changed', handler);
    };
  }, []);


  return (
    <div className="home-tab-container">
      {searchQuery.trim() ? null : (
        <>
          {/* Hero Banner */}
          {showBanner && bannerSrc && (
            <div className="hero-banner-new">
              <img src={bannerSrc} alt="عروض حصرية" className="hero-banner-img-full" onError={() => setShowBanner(false)} />
            </div>
          )}

          {/* Offers Section - Horizontal Ticker */}
          {loading ? (
            <div className="offers-ticker-container" style={{ padding: '1rem' }}>
              <SkeletonProductCard />
            </div>
          ) : (
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
          )}

          {/* تشكيلة مميزة - أعلى المنتجات كمية */}
          {topStock.length > 0 && (
            <div className="offers-ticker-container">
              <div className="offers-ticker-header">
                <div className="section-card-title-group">
                  <span className="section-card-icon">⭐</span>
                  <h3 className="section-card-title">تشكيلة مميزة</h3>
                </div>
                <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView('top-stock'); }}>عرض الكل</span>
              </div>
              <div className="offers-ticker-track">
                {topStock.map((product) => (
                  <div key={product.id} className="offer-ticker-item">
                    <div className="offer-ticker-img-wrap">
                      {product.isOffer && <span className="offer-ticker-badge">%</span>}
                      <img src={product.imageUrl} alt={product.name} className="offer-ticker-img"
                        onError={(e) => { e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#127443" width="100" height="100"/><text fill="#FFF" font-family="sans-serif" font-size="20" x="50" y="55" text-anchor="middle">ثرا</text></svg>'); }} />
                    </div>
                    <div className="offer-ticker-info">
                      <div className="offer-ticker-name">{product.name}</div>
                      <div className="offer-ticker-price">
                        {product.isOffer && product.offerPrice ? (
                          <><span className="offer-ticker-old-price">{(product.price || 0).toFixed(2)}</span> {(product.offerPrice || 0).toFixed(2)}</>
                        ) : (product.price || 0).toFixed(2)}
                        <span className="offer-ticker-currency"> ر.س</span>
                      </div>
                      <button className="offer-ticker-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Options */}
          <div className="home-section-card delivery-options-card" onClick={() => setShowDeliveryInfo(true)}>
            <div className="delivery-options-grid">
              <div className="delivery-option-item">
                <div className="delivery-option-info">
                  <h4>توصيل الطلبات</h4>
                  <p>توصيل مجاني للطلبات فوق ١٠٠ ر.س</p>
                </div>
                <img src={`${BASE}newicon.jpg`} alt="توصيل" className="delivery-option-img" onError={(e) => { e.target.style.display='none'; }} />
              </div>
            </div>
          </div>

          {/* Delivery Info Modal */}
          {showDeliveryInfo && (
            <div className="delivery-info-overlay" onClick={() => setShowDeliveryInfo(false)}>
              <div className="delivery-info-modal" onClick={(e) => e.stopPropagation()}>
                <button className="delivery-info-close" onClick={() => setShowDeliveryInfo(false)}>✕</button>
                <img src={`${BASE}newicon.jpg`} alt="توصيل" className="delivery-info-icon-img" onError={(e) => { e.target.style.display='none'; }} />
                <h3>يسرنا خدمتكم في أسواق ثرا الشرق ون</h3>
                <p className="delivery-info-sub">شفافية تامة في حساب أجرة التوصيل</p>
                <p className="delivery-info-contact">😊 يمكنك طلب شخص لتتواصل معه هاتفياً لتسجيل كافة طلباتك يدوياً كذلك من خلال <a href={`tel:${PHONE}`}>الاتصال</a> أو <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer">الواتساب</a></p>
                <div className="delivery-info-table">
                  <div className="delivery-info-row">
                    <span className="delivery-info-label">المسافة ≤ 3 كم</span>
                    <span className="delivery-info-value">٥ ر.س</span>
                  </div>
                  <div className="delivery-info-row">
                    <span className="delivery-info-label">من ٣ إلى ٦ كم</span>
                    <span className="delivery-info-value">١٠ ر.س</span>
                  </div>
                  <div className="delivery-info-row">
                    <span className="delivery-info-label">من ٦ إلى ١٠ كم</span>
                    <span className="delivery-info-value">١٥ ر.س</span>
                  </div>
                  <div className="delivery-info-row">
                    <span className="delivery-info-label">أكثر من ١٠ كم</span>
                    <span className="delivery-info-value">٢٠ ر.س</span>
                  </div>
                  <div className="delivery-info-row delivery-info-free">
                    <span className="delivery-info-label">الطلبات فوق ١٠٠ ر.س</span>
                    <span className="delivery-info-value">مجاني</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Us */}
          <div className="home-contact-card">
            <div className="home-contact-title">اتصل بنا</div>
            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
              <a href={`tel:${PHONE}`} style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: '#127443', color: 'white',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: '#25D366', color: 'white',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
              <a href={`mailto:${EMAIL_1}`} style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: '#ea4335', color: 'white',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </a>
              <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: '#FFFC00', color: '#000',
              }}>
                <svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default HomeTab;
