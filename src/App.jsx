import React, { useContext, useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext, useStore } from './context/StoreContext';
import { categories } from './data/mockData';
import L from 'leaflet';
import InstallPrompt from './components/InstallPrompt';

const BASE = import.meta.env.BASE_URL || '/';

function imgFallback(w, h, bg, fg, text) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + bg + '" width="' + w + '" height="' + h + '"/><text fill="' + fg + '" font-family="sans-serif" font-size="' + Math.min(w, h) / 6 + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + text + '</text></svg>');
}

function AddShortcutButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const handler = (e) => {
      try { e.preventDefault(); } catch(err) {}
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          window.__deferredPrompt = null;
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.log('install prompt error', err);
      }
      return;
    }

    // Trigger custom event to display custom install instructions (iOS or other browsers)
    window.dispatchEvent(new CustomEvent('show-pwa-install-prompt'));
  };

  if (isStandalone) return null;

  return (
    <button className="app-install-header-btn" onClick={onClick} title="تثبيت التطبيق على جهازك">
      <svg className="app-install-header-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span className="app-install-header-text">تثبيت</span>
    </button>
  );
}

export default function App() {
  const { products, cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    placeOrder, chatMessages, sendMessage, user, logout, orders } = useContext(StoreContext);

  const [tab, setTab] = useState('home');
  const [prevTab, setPrevTab] = useState('home');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slideDir, setSlideDir] = useState('left');

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2200); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('sw-update', handler);
    return () => window.removeEventListener('sw-update', handler);
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const userOrders = orders.filter(o => o.customerEmail === user?.email);

  const switchTab = useCallback((t) => {
    const order = ['home', 'orders', 'account'];
    setSlideDir(order.indexOf(t) > order.indexOf(tab) ? 'left' : 'right');
    setPrevTab(tab);
    setTab(t);
  }, [tab]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-wrapper">
      {updateAvailable && <UpdateBanner />}
      <InstallPrompt />
      <AppHeader cartCount={cartCount} user={user} logout={logout}
        onCartOpen={() => setIsCartOpen(true)} tab={tab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <div className={`app-content ${tab === 'home' ? '' : 'app-content-nohome'}`}>
        <div className={`app-slide ${slideDir === 'left' ? 'slide-in-left' : 'slide-in-right'}`}>
          {tab === 'home' && <HomeTab key="home" products={products} selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory} addToCart={addToCart} cartCount={cartCount} setIsCartOpen={setIsCartOpen} />}
        </div>
        <div className={`app-slide ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
          {tab === 'orders' && <OrdersTab key="orders" orders={userOrders} />}
          {tab === 'account' && <AccountTab key="account" user={user} logout={logout} />}
        </div>
      </div>

      <AppTabbar tab={tab} onTabChange={switchTab} cartCount={cartCount} />

      {isCartOpen && <CartScreen cart={cart} cartTotal={cartTotal} cartCount={cartCount}
        updateCartQty={updateCartQty} removeFromCart={removeFromCart}
        onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />}

      {isCheckoutOpen && <CheckoutModal cartTotal={cartTotal} onClose={() => setIsCheckoutOpen(false)} placeOrder={placeOrder} />}

      <ChatWidget chatMessages={chatMessages} sendMessage={sendMessage} />
    </div>
  );
}

/* ─── Update Banner ─── */
const UpdateBanner = memo(() => {
  const apply = () => {
    const reg = window.__swRegistration;
    if (!reg || !reg.waiting) return;
    reg.waiting.postMessage('SKIP_WAITING');
    window.location.reload();
  };
  return (
    <div className="update-banner">
      <span>يتوفر تحديث جديد</span>
      <button onClick={apply}>تحديث الآن</button>
    </div>
  );
});

/* ─── Splash ─── */
const SplashScreen = memo(() => (
  <div className="splash-screen">
    <div className="splash-content">
      <img src={`${BASE}LOGO.jpg`} alt="" className="splash-logo" />
      <h1 className="splash-title">أسواق ثرا الشرق ون</h1>
      <p className="splash-subtitle">توصيل لباب بيتك في الخفجي</p>
      <div className="splash-loader"><div className="splash-loader-bar" /></div>
    </div>
  </div>
));

/* ─── Header ─── */
const AppHeader = memo(({ cartCount, user, onCartOpen, tab, searchQuery, setSearchQuery }) => (
  <header className="app-header">
    <div className="app-header-inner">
      <div className="app-logo">
        <img src={`${BASE}LOGO.jpg`} alt="" className="app-logo-img"
          onError={(e) => { e.target.src = imgFallback(36, 36, '#127443', '#FFFFFF', 'ث'); }} />
        <div>
          <div className="app-title">ثرا الشرق ون</div>
          <div className="app-subtitle">توصيل الخفجي</div>
        </div>
      </div>
      <div className="app-header-actions">
        <AddShortcutButton />
        {user ? <span className="app-user-badge">{user.email?.split('@')[0]}</span>
          : <Link to="/login" className="app-login-link">دخول</Link>}
        <button className="app-cart-btn" onClick={onCartOpen}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartCount > 0 && <span className="app-cart-badge">{cartCount}</span>}
        </button>
      </div>
    </div>
    {tab === 'home' && (
      <div className="app-search">
        <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="app-search-input" placeholder="ابحث عن المنتجات..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
    )}
  </header>
));

/* ─── Tab Bar ─── */
const AppTabbar = memo(({ tab, onTabChange, cartCount }) => (
  <nav className="app-tabbar">
    <button className={`app-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span className="app-tab-label">الرئيسية</span>
    </button>
    <button className={`app-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => onTabChange('orders')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'orders' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span className="app-tab-label">طلباتي</span>
    </button>
    <button className={`app-tab ${tab === 'account' ? 'active' : ''}`} onClick={() => onTabChange('account')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span className="app-tab-label">حسابي</span>
    </button>
  </nav>
));

/* ─── Cart Screen (full page slide-up) ─── */
const CartScreen = memo(({ cart, cartTotal, cartCount, updateCartQty, removeFromCart, onClose, onCheckout }) => (
  <div className="cart-screen-overlay" onClick={onClose}>
    <div className="cart-screen" onClick={e => e.stopPropagation()}>
      <div className="cart-screen-header">
        <div className="cart-screen-handle" />
        <div className="cart-screen-title-row">
          <h2>سلة المشتريات</h2>
          <span className="cart-screen-count">{cartCount} منتج</span>
        </div>
        <button className="cart-screen-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="cart-screen-body">
        {cart.length === 0 ? (
          <div className="cart-screen-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <p>السلة فارغة</p>
          </div>
        ) : cart.map(item => (
          <div key={item.id} className="cart-screen-item">
            <img src={item.imageUrl} alt={item.name} className="cart-screen-item-img"
              onError={(e) => { e.target.src = imgFallback(80, 80, '#127443', '#FFFFFF', 'IMG'); }} />
            <div className="cart-screen-item-info">
              <div className="cart-screen-item-name">{item.name}</div>
              <div className="cart-screen-item-price">{(item.currentPrice || item.price).toFixed(2)} ر.س</div>
              <div className="cart-screen-item-controls">
                <button className="cart-screen-qty circular" onClick={() => updateCartQty(item.id, -1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span className="cart-screen-qty-value">{item.qty}</span>
                <button className="cart-screen-qty circular" onClick={() => updateCartQty(item.id, 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button className="cart-screen-item-remove" onClick={() => removeFromCart(item.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-screen-footer">
        <div className="cart-screen-total-row">
          <span>المجموع</span>
          <span className="cart-screen-total-price">{cartTotal.toFixed(2)} ر.س</span>
        </div>
        <button className="cart-screen-checkout-btn" disabled={cart.length === 0} onClick={onCheckout}>
          تأكيد الطلب
        </button>
      </div>
    </div>
  </div>
));

/* ─── Home Tab ─── */
const HomeTab = memo(({ products, selectedCategory, setSelectedCategory, addToCart, cartCount, setIsCartOpen }) => {
  const [showBanner, setShowBanner] = useState(true);
  const { allProducts } = useStore();

  const offerProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => p.isOffer);
  }, [allProducts]);

  return (
    <div className="home-tab-container">
      {/* 1. Hero Welcome Banner Card */}
      {showBanner && (
        <div className="home-banner-card">
          <div className="home-banner-card-bg" />
          <div className="home-banner-card-content">
            <div className="home-banner-card-text">
              <h2>أسواق ثرا الشرق ون</h2>
              <p>كل ما تحتاجه من السوبرماركت يوصلك لباب بيتك بالخفجي 📦</p>
              <div className="home-banner-badge-row">
                <span className="banner-badge">⏱️ توصيل سريع</span>
                <span className="banner-badge">🚚 مجاني فوق ١٠٠ ر.س</span>
              </div>
            </div>
            <button className="home-banner-card-dismiss" onClick={() => setShowBanner(false)} aria-label="إغلاق البانر">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 2. Special Offers Section Card (Horizontal Scroll) */}
      {offerProducts.length > 0 && selectedCategory === 'الكل' && (
        <div className="home-section-card offers-card">
          <div className="section-card-header">
            <div className="section-card-title-group">
              <span className="section-card-icon">🔥</span>
              <h3 className="section-card-title">العروض المميزة اليومية</h3>
            </div>
            <span className="section-card-action-link" onClick={() => setSelectedCategory('العروض')}>عرض الكل</span>
          </div>
          <div className="offers-horizontal-scroll">
            {offerProducts.map(product => (
              <ProductCardMini key={`offer-${product.id}`} product={product} addToCart={addToCart} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Store Categories Section Card */}
      <div className="home-section-card categories-card">
        <div className="section-card-header">
          <div className="section-card-title-group">
            <span className="section-card-icon">🛍️</span>
            <h3 className="section-card-title">أقسام المتجر</h3>
          </div>
        </div>
        <div className="categories-horizontal-scroll">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span className="category-pill-emoji">{getCategoryEmoji(cat)}</span>
              <span className="category-pill-text">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Products Grid Section Card */}
      <div className="home-section-card products-list-card">
        <div className="section-card-header">
          <div className="section-card-title-group">
            <span className="section-card-icon">🥬</span>
            <h3 className="section-card-title">
              {selectedCategory === 'الكل' ? 'كل المنتجات' : selectedCategory}
            </h3>
          </div>
          <span className="products-count-badge">{products.length} منتج</span>
        </div>
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
          {products.length === 0 && (
            <div className="no-products-card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>عذراً، لم نجد أي منتجات تطابق بحثك.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ─── Orders Tab ─── */
const OrdersTab = memo(({ orders }) => {
  if (!orders.length) return (
    <div className="empty-tab">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <h3>لا توجد طلبات سابقة</h3>
      <p>عند تقديم طلب جديد، ستظهر طلباتك هنا</p>
    </div>
  );
  return (
    <div className="orders-tab">
      <h2 className="orders-tab-title">طلباتي</h2>
      {orders.map(order => (
        <div key={order.id} className="order-card-mini">
          <div className="order-card-mini-top">
            <div>
              <div className="order-card-mini-id">طلب #{order.id.slice(-6)}</div>
              <div className="order-card-mini-date">{new Date(order.date).toLocaleDateString('ar-SA')}</div>
            </div>
            <span className={`order-badge ${order.status === 'جديد' ? 'badge-new' : order.status === 'قيد التحضير' ? 'badge-prep' : order.status === 'في الطريق' ? 'badge-route' : order.status === 'مكتمل' ? 'badge-done' : 'badge-cancel'}`}>{order.status}</span>
          </div>
          <div className="order-card-mini-items">
            {order.items?.slice(0, 3).map(item => <span key={item.id}>{item.name} ×{item.qty}</span>)}
            {order.items?.length > 3 && <span className="order-card-mini-more">+{order.items.length - 3} أخرى</span>}
          </div>
          <div className="order-card-mini-total"><strong>{order.total.toFixed(2)} ر.س</strong></div>
        </div>
      ))}
    </div>
  );
});

/* ─── Account Tab ─── */
const AccountTab = memo(({ user, logout }) => {
  if (!user) return (
    <div className="empty-tab">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <h3>تسجيل الدخول</h3>
      <p>سجل دخولك لمتابعة طلباتك والمزيد</p>
      <Link to="/login" className="btn" style={{ marginTop: '1rem' }}>تسجيل الدخول</Link>
      <Link to="/register" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>إنشاء حساب جديد</Link>
    </div>
  );
  return (
    <div className="account-tab">
      <div className="account-profile">
        <div className="account-avatar-lg">{user.email?.charAt(0).toUpperCase()}</div>
        <div className="account-name">{user.email?.split('@')[0]}</div>
        <div className="account-email">{user.email}</div>
      </div>
      <button className="account-logout-btn" onClick={logout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        تسجيل الخروج
      </button>
    </div>
  );
});

/* ─── Product Card Emoji Helper ─── */
const getCategoryEmoji = (category) => {
  switch (category) {
    case 'الكل': return '🏪';
    case 'العروض': return '🔥';
    case 'المؤن': return '🥫';
    case 'الألبان': return '🥛';
    case 'المشروبات': return '🥤';
    case 'اللحوم والدواجن': return '🥩';
    case 'المخبوزات': return '🍞';
    case 'التسالي': return '🍿';
    case 'الخضروات والفواكه': return '🥦';
    case 'المنظفات': return '🧼';
    default: return '📦';
  }
};

/* ─── Product Card Mini ─── */
const ProductCardMini = memo(({ product, addToCart }) => {
  const [added, setAdded] = useState(false);
  const handleAdd = (e) => { 
    e.stopPropagation();
    addToCart(product); 
    setAdded(true); 
    setTimeout(() => setAdded(false), 600); 
  };
  return (
    <div className="product-card-mini-item">
      <div className="mini-card-img-wrap">
        <span className="mini-card-badge-offer">%</span>
        <img src={product.imageUrl} alt={product.name} className="mini-card-img" loading="lazy"
          onError={(e) => { e.target.src = imgFallback(150, 150, '#f3f7f4', '#127443', 'ثرا'); }} />
        <button className={`mini-card-add ${added ? 'added' : ''}`} onClick={handleAdd}>
          {added ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </button>
      </div>
      <div className="mini-card-body">
        <div className="mini-card-name">{product.name}</div>
        <div className="mini-card-price-row">
          <span className="mini-card-price">{product.offerPrice ? product.offerPrice.toFixed(2) : product.price.toFixed(2)}<span className="mini-card-currency"> ر.س</span></span>
          {product.offerPrice && <span className="mini-card-old-price">{product.price.toFixed(2)}</span>}
        </div>
      </div>
    </div>
  );
});

/* ─── Product Card ─── */
const ProductCard = memo(({ product, addToCart }) => {
  const [added, setAdded] = useState(false);
  const handleAdd = () => { addToCart(product); setAdded(true); setTimeout(() => setAdded(false), 600); };
  return (
    <div className="product-card-new">
      <div className="product-card-new-img-wrap">
        {product.isOffer && <span className="product-badge-offer">%</span>}
        <img src={product.imageUrl} alt={product.name} className="product-card-new-img" loading="lazy"
          onError={(e) => { e.target.src = imgFallback(400, 400, '#f3f7f4', '#127443', 'ثرا'); }} />
        <button className={`product-card-new-add ${added ? 'added' : ''}`} onClick={handleAdd}>
          {added ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
        </button>
      </div>
      <div className="product-card-new-body">
        <div className="product-card-new-cat">{product.category}</div>
        <div className="product-card-new-name">{product.name}</div>
        <div className="product-card-new-price">
          {product.isOffer ? (
            <><span className="offer-old">{product.price.toFixed(2)}</span> {product.offerPrice.toFixed(2)}</>
          ) : product.price.toFixed(2)}
          <span className="product-card-new-currency"> ر.س</span>
        </div>
      </div>
    </div>
  );
});

/* ─── Chat Widget ─── */
const ChatWidget = memo(({ chatMessages, sendMessage }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const send = () => { if (!text.trim()) return; sendMessage('customer', text); setText(''); };
  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-window">
          <div className="chat-win-header">
            <span>تحدث معنا</span>
            <button onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="chat-win-body">
            {chatMessages.map(m => (
              <div key={m.id} className={`chat-bubble ${m.sender === 'customer' ? 'me' : 'them'}`}>
                <div>{m.text}</div>
                <div className="chat-time">{m.time}</div>
              </div>
            ))}
          </div>
          <div className="chat-win-input">
            <input type="text" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()} placeholder="اكتب رسالة..." />
            <button onClick={send}>إرسال</button>
          </div>
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
  );
});

/* ─── Khafji Map ─── */
const KhafjiMap = memo(({ position, setPosition }) => {
  const mapRef = useRef(null);
  const inst = useRef(null);
  const marker = useRef(null);
  const userInteracted = useRef(false);
  useEffect(() => {
    if (inst.current) return;
    const map = L.map(mapRef.current, { center: [28.4355, 48.4988], zoom: 13, minZoom: 12 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map);
    map.on('click', (e) => {
      userInteracted.current = true;
      setPosition(e.latlng);
      if (marker.current) marker.current.setLatLng([e.latlng.lat, e.latlng.lng]);
      else marker.current = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
    });
    inst.current = map;
    return () => { map.remove(); inst.current = null; marker.current = null; };
  }, []);
  const syncMarker = useCallback((pos) => {
    if (!inst.current) return;
    inst.current.setView([pos.lat, pos.lng], 15);
    if (marker.current) marker.current.setLatLng([pos.lat, pos.lng]);
    else marker.current = L.marker([pos.lat, pos.lng]).addTo(inst.current);
  }, []);
  const locate = useCallback(() => {
    if (!navigator.geolocation || userInteracted.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (userInteracted.current) return;
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        syncMarker(p);
        setPosition(p);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  useEffect(() => {
    if (!inst.current || userInteracted.current) return;
    const t = setTimeout(locate, 500);
    return () => clearTimeout(t);
  }, [inst.current]);
  useEffect(() => {
    const ro = new ResizeObserver(() => inst.current?.invalidateSize());
    if (mapRef.current) ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="khafji-map-wrap">
      <div ref={mapRef} className="khafji-map" />
      <button className="locate-btn" onClick={() => { userInteracted.current = false; locate(); }}>🎯</button>
    </div>
  );
});

/* ─── Checkout ─── */
const KHAFJI_BOUNDS = { minLat: 28.35, maxLat: 28.50, minLng: 48.40, maxLng: 48.55 };
const isInKhafji = (pos) => pos && pos.lat >= KHAFJI_BOUNDS.minLat && pos.lat <= KHAFJI_BOUNDS.maxLat && pos.lng >= KHAFJI_BOUNDS.minLng && pos.lng <= KHAFJI_BOUNDS.maxLng;

const CheckoutModal = memo(({ cartTotal, onClose, placeOrder }) => {
  const [position, setPosition] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mada');
  const fee = cartTotal >= 100 ? 0 : 15;
  const outside = position && !isInKhafji(position);
  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-sheet" onClick={e => e.stopPropagation()}>
        <div className="checkout-handle" />
        <div className="checkout-head">
          <h2>إتمام الطلب</h2>
          <button onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="checkout-body">
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">1</span> موقع التوصيل</div>
            <p className="checkout-hint">انقر على الخريطة لتحديد موقعك</p>
            <div className={`checkout-map ${position ? '' : 'checkout-map-empty'}`}>
              <KhafjiMap position={position} setPosition={setPosition} />
            </div>
            {position && !outside && <div className="checkout-confirmed">✓ تم تحديد الموقع</div>}
            {outside && <div className="checkout-outside">⚠️ التوصيل فقط داخل مدينة الخفجي</div>}
          </div>
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">2</span> طريقة الدفع</div>
            <div className="checkout-payments">
              {[
                { id: 'mada', label: 'مدى', icon: '💳' },
                { id: 'bank_transfer', label: 'تحويل بنكي', icon: '🏦' },
                { id: 'cod', label: 'الدفع عند الاستلام', icon: '💵' },
              ].map(m => (
                <button key={m.id} className={`checkout-pay-btn ${paymentMethod === m.id ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(m.id)}>
                  <span className="checkout-pay-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="checkout-total-box">
            <div className="checkout-total-row"><span>المجموع الفرعي</span><span>{cartTotal.toFixed(2)} ر.س</span></div>
            <div className="checkout-total-row">{fee === 0 ? <span>رسوم التوصيل <span className="checkout-free">مجاناً</span></span> : <span>رسوم التوصيل</span>}<span>{fee === 0 ? '0' : fee.toFixed(2)} ر.س</span></div>
            <div className="checkout-total-row checkout-total-final"><span>الإجمالي</span><span>{(cartTotal + fee).toFixed(2)} ر.س</span></div>
          </div>
          <button className="checkout-confirm-btn" onClick={() => {
            if (!position || outside) return; placeOrder({ location: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`, paymentMethod }); onClose();
          }} disabled={!position || outside}>تأكيد الطلب</button>
        </div>
      </div>
    </div>
  );
});
