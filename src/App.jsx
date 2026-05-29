import React, { useContext, useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext, useStore } from './context/StoreContext';
import { categories } from './data/mockData';
import L from 'leaflet';
import InstallPrompt from './components/InstallPrompt';
import { showToast } from './components/Toast.jsx';

const BASE = import.meta.env.BASE_URL || '/';

// Contact info
const PHONE = '00966503159093';
const PHONE_DISPLAY = '0503159093';
const WHATSAPP_NUM = '966503159093';
const EMAIL_1 = 'tharaalshrqwan@gmail.com';
const EMAIL_2 = 'admin@tharasharqone.com';
const SNAPCHAT = 'tharaaeastone';

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

function imgFallback(w, h, bg, fg, text) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + bg + '" width="' + w + '" height="' + h + '"/><text fill="' + fg + '" font-family="sans-serif" font-size="' + Math.min(w, h) / 6 + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + text + '</text></svg>');
}
const logoPath = BASE + 'logo222.jpg';
function productImgError(e) { if (e.target.src !== logoPath) e.target.src = logoPath; }

export default function App() {
  const { products, cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    placeOrder, user, logout, orders,
    customerProfile, updateCustomerProfile, loadOrders,
    chatMessages } = useContext(StoreContext);

  const [tab, setTab] = useState('home');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slideDir, setSlideDir] = useState('left');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showAllView, setShowAllView] = useState(null); // 'all' | 'offers' | 'bestsellers' | null
  const [prevTab, setPrevTab] = useState('home');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1220' : '#127443');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 14500); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('sw-update', handler);
    return () => window.removeEventListener('sw-update', handler);
  }, []);

  // Request notification permission for order status updates
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Browser notification when order status changes (customer view)
  useEffect(() => {
    const handler = (e) => {
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        const order = e.detail;
        if (!order) return;
        let body = '';
        if (order.status === 'قيد التحضير') body = 'طلبك قيد التحضير الآن';
        else if (order.status === 'جاهز للتوصيل') body = 'طلبك جاهز للتوصيل!';
        else if (order.status === 'في الطريق') {
          const eta = order.estimatedDelivery;
          body = eta ? `السائق في الطريق — الوصول خلال ${eta} دقيقة` : 'السائق في الطريق إليك';
        } else if (order.status === 'مكتمل') body = 'تم توصيل طلبك بنجاح ✓';
        else body = `تحديث الطلب: ${order.status}`;
        new Notification('ثراء الشرق ون', { body, tag: 'thara-order', lang: 'ar', icon: BASE + 'cart-icon-192.png' });
      } catch { /* ignore */ }
    };
    window.addEventListener('thara:order-status', handler);
    return () => window.removeEventListener('thara:order-status', handler);
  }, []);

  // Flash browser tab title on new messages when tab is inactive
  useEffect(() => {
    let interval = null;
    let isOriginal = true;
    const originalTitle = document.title;

    const handleNewMessage = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          document.title = isOriginal ? '💬 رسالة دعم جديدة...' : originalTitle;
          isOriginal = !isOriginal;
        }, 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        document.title = originalTitle;
      }
    };

    window.addEventListener('thara:new-message', handleNewMessage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('thara:new-message', handleNewMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) clearInterval(interval);
      document.title = originalTitle;
    };
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const userOrders = orders.filter(o => o.customerEmail === user?.email);
  const notifLastOpened = localStorage.getItem('thara_notif_last_opened') || '';
  const unreadNotifs = useMemo(() => {
    if (!user) return 0;
    const relevant = chatMessages.filter(m =>
      m.customerEmail === user.email &&
      m.sender !== 'customer'
    );
    if (!notifLastOpened) return relevant.length;
    const lastTime = new Date(notifLastOpened).getTime();
    return relevant.filter(m => {
      const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      return msgTime > lastTime;
    }).length;
  }, [chatMessages, user, notifLastOpened]);

  const switchTab = useCallback((t) => {
    if (t === 'cart') { setIsCartOpen(true); return; }
    if (t !== 'home') setShowAllView(null);
    const order = ['home', 'categories', 'orders', 'account'];
    const curIdx = order.indexOf(tab);
    const nextIdx = order.indexOf(t);
    if (curIdx === nextIdx || nextIdx === -1) return;
    setSlideDir(nextIdx > curIdx ? 'left' : 'right');
    setPrevTab(tab);
    setTab(t);
  }, [tab]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-wrapper">
      {updateAvailable && <UpdateBanner />}
      <InstallPrompt />
      <AppHeader cartCount={cartCount} user={user} logout={logout}
        onCartOpen={() => setIsCartOpen(true)} tab={tab}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        unreadNotifs={unreadNotifs}
        theme={theme}
        onMenuClick={() => setIsDrawerOpen(true)}
        onNotifClick={() => { setIsDrawerOpen(false); setIsNotifOpen(o => !o); }} />

        <div className={`app-content ${tab === 'home' && !showAllView ? '' : 'app-content-nohome'}`}>
        {showAllView ? (
          <AllProductsView view={showAllView} onBack={() => setShowAllView(null)}
            products={products} addToCart={addToCart} cart={cart} />
        ) : (
        <div className={`app-slide ${slideDir === 'left' ? 'slide-in-left' : 'slide-in-right'}`}>
          {tab === 'home' && <HomeTab key="home" products={products} selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory} addToCart={addToCart} cart={cart} cartCount={cartCount} setIsCartOpen={setIsCartOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            setShowAllView={setShowAllView} />}
        </div>
        )}
        <div className={`app-slide ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
          {tab === 'categories' && <CategoriesTab key="categories" setShowAllView={setShowAllView} onTabChange={switchTab} />}
          {tab === 'orders' && <OrdersTab key="orders" orders={userOrders} loadOrders={loadOrders} />}
          {tab === 'account' && <AccountTab key="account" user={user} logout={logout} customerProfile={customerProfile} updateCustomerProfile={updateCustomerProfile} theme={theme} toggleTheme={toggleTheme} />}
          </div>
        </div>

      <AppTabbar tab={tab} onTabChange={switchTab} cartCount={cartCount} onCartOpen={() => setIsCartOpen(true)} />

      {isCartOpen && <CartScreen cart={cart} cartTotal={cartTotal} cartCount={cartCount}
        updateCartQty={updateCartQty} removeFromCart={removeFromCart}
        onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />}

      {isCheckoutOpen && <CheckoutModal cartTotal={cartTotal} onClose={() => setIsCheckoutOpen(false)} placeOrder={placeOrder} />}

      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}
        user={user} logout={logout} tab={tab} selectedCategory={selectedCategory} onTabChange={switchTab}
        setSelectedCategory={setSelectedCategory}
        theme={theme} toggleTheme={toggleTheme} />

      {isNotifOpen && <NotifPanel user={user} chatMessages={chatMessages}
        onClose={() => setIsNotifOpen(false)}
        orders={orders} onTabChange={switchTab} />}

      <SupportChatWidget />
    </div>
  );
}

/* ─── Update Banner ─── */
const UpdateBanner = memo(() => {
  const apply = () => {
    const reg = window.__swRegistration;
    if (!reg || !reg.waiting) return;
    reg.waiting.addEventListener('statechange', (e) => {
      if (e.target.state === 'activated') {
        window.location.reload();
      }
    });
    reg.waiting.postMessage('SKIP_WAITING');
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
    <div className="splash-curtain">
      <div className="splash-box">
        <img src={`${BASE}logo222.jpg`} alt="" className="splash-logo"
          onError={(e) => { e.target.src = imgFallback(100, 100, '#127443', '#FFFFFF', 'ث'); }} />
        <h1 className="splash-title">ثراء الشرق ون</h1>
        <p className="splash-tagline">خدمة التوصيل</p>
        <div className="splash-loader"><div className="splash-loader-bar" /></div>
      </div>
    </div>
  </div>
));

/* ─── Header ─── */
const AppHeader = memo(({ cartCount, user, onCartOpen, tab, searchQuery, setSearchQuery, unreadNotifs, onMenuClick, onNotifClick, theme }) => (
  <header className="app-header-new">
    <div className="app-header-new-inner">
      <button className="app-header-icon-btn" onClick={onMenuClick} aria-label="القائمة">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      <div className="app-logo-new">
        <img src={`${BASE}${theme === 'dark' ? 'logonaet.jpg' : 'logo222.jpg'}`} alt="ثراء الشرق" className="app-logo-img-new" onError={(e) => { e.target.src = imgFallback(90, 90, '#127443', '#FFFFFF', 'ث'); }} />
      </div>

      <div className="app-header-actions">
        <button className="app-header-icon-btn app-header-notif-btn" onClick={onNotifClick} aria-label="الإشعارات">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {unreadNotifs > 0 && (
            <span className="app-header-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
          )}
        </button>
      </div>
    </div>
  </header>
));

const AppTabbar = memo(({ tab, onTabChange, cartCount, onCartOpen }) => (
  <nav className="app-tabbar">
    <button className={`app-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span className="app-tab-label">الرئيسية</span>
    </button>
    <button className={`app-tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => onTabChange('categories')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'categories' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      <span className="app-tab-label">الأقسام</span>
    </button>
    <button className={`app-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => onTabChange('orders')}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === 'orders' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span className="app-tab-label">طلباتي</span>
    </button>
    <button className="app-tab" onClick={onCartOpen}>
      <div className="app-tab-icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        {cartCount > 0 && <span className="app-cart-badge">{cartCount}</span>}
      </div>
      <span className="app-tab-label">السلة</span>
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
              onError={productImgError} />
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

/* ─── All Products View (Full Screen) ─── */
const AllProductsView = memo(({ view, onBack, products, addToCart, cart }) => {
  const catNames = ['الخضروات والفواكه', 'اللحوم والدواجن', 'الألبان', 'المؤن', 'المشروبات', 'المخبوزات', 'المنظفات', 'التسالي'];
  const title = view === 'offers' ? 'العروض المميزة' : view === 'bestsellers' ? 'الأكثر مبيعا' : catNames.includes(view) ? view : 'جميع المنتجات';
  const [catSearch, setCatSearch] = useState('');
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
    </div>
  );
});

/* ─── Rotating Featured Section ─── */
const RotatingSection = memo(({ products, addToCart, setShowAllView, cart }) => {
  const { allProducts } = useStore();
  const [modeIndex, setModeIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const modeRef = useRef(modeIndex);
  modeRef.current = modeIndex;
  const modes = useMemo(() => [
    {
      id: 'offers',
      icon: '🔥',
      title: 'العروض المميزة اليومية',
      products: (allProducts || []).filter(p => p.isOffer),
    },
    {
      id: 'all',
      icon: '🥬',
      title: 'أكثر من 15000 صنف في مكان واحد',
      products: products,
    },
    {
      id: 'bestsellers',
      icon: '🏆',
      title: 'الأكثر مبيعا',
      products: products.slice(0, 6),
    },
  ], [allProducts, products]);

  useEffect(() => {
    const t = setInterval(() => {
      const mi = modeRef.current;
      const mode = modes[mi];
      const max = Math.max(0, Math.ceil(mode.products.length / 3) - 1);
      if (max === 0) {
        setModeIndex(i => (i + 1) % modes.length);
        setSubIndex(0);
      } else {
        setSubIndex(i => {
          const n = i + 1;
          return n > max ? 0 : n;
        });
      }
    }, 15000);
    return () => clearInterval(t);
  }, [modes]);

  const current = modes[modeIndex];
  const totalPages = Math.max(1, Math.ceil(current.products.length / 3));
  const safeSub = Math.min(subIndex, totalPages - 1);
  const pageItems = current.products.slice(safeSub * 3, safeSub * 3 + 3);
  const pageCount = Math.min(3, pageItems.length);
  const switchMode = (i) => { setModeIndex(i); setSubIndex(0); };
  const cycleMode = (e) => { e.stopPropagation(); switchMode((modeIndex + 1) % modes.length); };

  return (
    <div className="home-section-card rotating-section-card">
      <div className="section-card-header" onClick={cycleMode}>
        <div className="section-card-title-group">
          <span className="section-card-icon">{current.icon}</span>
          <h3 className="section-card-title">{current.title}</h3>
        </div>
        <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView(current.id); }}>عرض الكل</span>
      </div>
      <div className="categories-grid-new" style={{ gridTemplateColumns: `repeat(${pageCount || 3}, 1fr)` }} onClick={(e) => { if (e.target === e.currentTarget) cycleMode(e); }}>
        {pageItems.map((product, i) => (
          <ProductCard key={`${current.id}-${product.id}-${i}`} product={product} addToCart={addToCart} cart={cart} />
        ))}
        {pageItems.length === 0 && (
          <div className="no-products-card" style={{ gridColumn: '1 / -1', padding: '1rem' }}>
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>
      <div className="rotating-dots">
        {modes.map((_, i) => (
          <span key={i} className={`rotating-dot ${modeIndex === i ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); switchMode(i); }} />
        ))}
      </div>
    </div>
  );
});

/* ─── Home Tab ─── */
const HomeTab = memo(({ products, selectedCategory, setSelectedCategory, addToCart, cart, cartCount, setIsCartOpen, searchQuery, setSearchQuery, setShowAllView }) => {
  const [showBanner, setShowBanner] = useState(true);

  const mainCategories = [
    { name: 'الخضروات والفواكه', img: `${BASE}Getty.webp`, fallback: '🥦' },
    { name: 'اللحوم والدواجن', img: `${BASE}cat_meat.png`, fallback: '🥩' },
    { name: 'الألبان', img: `${BASE}cat_dairy.png`, fallback: '🥛' },
    { name: 'المؤن', img: `${BASE}cat_canned.png`, fallback: '🥫' },
    { name: 'المشروبات', img: `${BASE}cat_beverages.png`, fallback: '🥤' },
    { name: 'المخبوزات', img: `${BASE}cat_dairy.jpg`, fallback: '🍞' },
    { name: 'المنظفات', img: `${BASE}cat_vegetables.jpg`, fallback: '🧹' },
    { name: 'التسالي', img: `${BASE}cat_canned.jpg`, fallback: '🍿' },
  ];
  const [catIndex, setCatIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCatIndex(i => (i + 3) % mainCategories.length), 15000);
    return () => clearInterval(t);
  }, []);
  const visibleCats = useMemo(() => {
    const cats = mainCategories.slice(catIndex, catIndex + 3);
    if (cats.length < 3) cats.push(...mainCategories.slice(0, 3 - cats.length));
    return cats;
  }, [catIndex]);

  return (
    <div className="home-tab-container">
      {/* 1. Hero Banner */}
      {showBanner && (
        <div className="hero-banner-new">
          <img src={`${BASE}123.jpg`} alt="عروض حصرية" className="hero-banner-img-full" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}

      {/* Search Bar */}
      <div className="home-search-bar">
        <div className="app-search-bar">
          <svg className="app-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" className="app-search-input" placeholder="ابحث عن منتج..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* 2. Categories Grid */}
      <div className="home-section-card categories-card-new">
        <div className="section-card-header" onClick={() => setCatIndex(i => (i + 3) % mainCategories.length)}>
          <h3 className="section-card-title">أقسام المنتجات</h3>
          <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView('all'); }}>عرض الكل</span>
        </div>
        <div className="categories-grid-new" onClick={(e) => { if (e.target === e.currentTarget) setCatIndex(i => (i + 3) % mainCategories.length); }}>
          {visibleCats.map((cat, i) => (
            <button key={cat.name + i} className="category-grid-item" onClick={(e) => { e.stopPropagation(); setShowAllView(cat.name); }}>
              <div className="category-grid-img-wrap">
                <img src={cat.img} alt={cat.name} className="category-grid-img" onError={(e) => { 
                  e.target.style.display='none'; 
                  e.target.nextSibling.style.display='flex';
                }} />
                <div className="category-grid-fallback" style={{display: 'none'}}>{cat.fallback}</div>
              </div>
              <span className="category-grid-text">{cat.name}</span>
            </button>
          ))}
        </div>
        <div className="rotating-dots">
          {[0,1,2].map(i => (
            <span key={i} className={`rotating-dot ${Math.floor(catIndex / 3) === i ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setCatIndex(i * 3); }} />
          ))}
        </div>
      </div>

      {/* 3. Rotating Featured Section */}
      {selectedCategory === 'الكل' && <RotatingSection products={products} addToCart={addToCart} setShowAllView={setShowAllView} cart={cart} />}

      {/* 4. Delivery Options Section */}

      {/* Delivery Options Section */}
      <div className="home-section-card delivery-options-card">
        <h3 className="section-card-title" style={{marginBottom: '0.25rem'}}>خدمة التوصيل</h3>
        <div className="delivery-options-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="delivery-option-item">
            <div className="delivery-option-info">
              <h4>توصيل لجميع أنحاء المحافظة</h4>
            </div>
            <img src={`${BASE}car.jpg`} alt="توصيل" className="delivery-option-img" onError={(e) => { e.target.src = imgFallback(80, 80, '#127443', '#FFFFFF', '🚗'); e.target.style.borderRadius = '50%'; }} />
          </div>
        </div>
      </div>
    </div>
  );
});

/* ─── Categories Tab ─── */
const CategoriesTab = memo(({ setShowAllView, onTabChange }) => {
  const allCats = useMemo(() => [
    { name: 'الخضروات والفواكه', img: `${BASE}Getty.webp`, fallback: '🥦', desc: 'طازج من المزرعة' },
    { name: 'اللحوم والدواجن', img: `${BASE}cat_meat.png`, fallback: '🥩', desc: 'طازج ومبرد' },
    { name: 'الألبان', img: `${BASE}cat_dairy.png`, fallback: '🥛', desc: 'حليب ومشتقاته' },
    { name: 'المؤن', img: `${BASE}cat_canned.png`, fallback: '🥫', desc: 'مواد غذائية أساسية' },
    { name: 'المشروبات', img: `${BASE}cat_beverages.png`, fallback: '🥤', desc: 'مشروبات باردة وساخنة' },
    { name: 'المخبوزات', img: `${BASE}cat_dairy.jpg`, fallback: '🍞', desc: 'خبز طازج ومعجنات' },
    { name: 'المنظفات', img: `${BASE}cat_vegetables.jpg`, fallback: '🧹', desc: 'منتجات التنظيف' },
    { name: 'التسالي', img: `${BASE}cat_canned.jpg`, fallback: '🍿', desc: 'وجبات خفيفة وحلويات' },
  ], [BASE]);
  const [catSearch, setCatSearch] = useState('');
  const filtered = useMemo(() => {
    if (!catSearch.trim()) return allCats;
    const q = catSearch.trim().toLowerCase();
    return allCats.filter(c => c.name.includes(q) || c.desc.includes(q));
  }, [catSearch, allCats]);
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
          <button key={cat.name} className="category-tab-card" onClick={() => {
            setShowAllView(cat.name);
            onTabChange('home');
          }}>
            {cat.img ? (
              <img src={cat.img} alt={cat.name} className="category-tab-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            ) : null}
            <span className="category-tab-emoji" style={{ display: cat.img ? 'none' : 'flex' }}>{cat.fallback}</span>
            <span className="category-tab-name">{cat.name}</span>
            <span className="category-tab-desc">{cat.desc}</span>
          </button>
        )) : <p className="cat-search-empty">لا توجد أقسام تطابق بحثك</p>}
      </div>
    </div>
  );
});

/* ─── Orders Tab ─── */
const OrdersTab = memo(({ orders, loadOrders }) => {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage } = useContext(StoreContext);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');

  useEffect(() => {
    if (!loadOrders) return;
    const interval = setInterval(() => {
      loadOrders();
      setLastUpdate(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const formatETA = (minutes) => {
    if (!minutes) return null;
    const now = new Date();
    now.setMinutes(now.getMinutes() + Number(minutes));
    return now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const orderChatMsgs = (orderId) => chatMessages.filter(m => !m.orderId || m.orderId === orderId);

  // Mark messages as read when order chat opens
  useEffect(() => {
    if (chatOrder) {
      const unreadIds = orderChatMsgs(chatOrder).filter(m => m.sender !== 'customer' && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0) markMessagesAsRead(unreadIds);
    }
  }, [chatOrder]);

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
      {chatOrder && (
        <div className="custom-chat-overlay" onClick={() => { setChatOrder(null); setChatText(''); }}>
          <div className="custom-chat-dialog" onClick={e => e.stopPropagation()}>
            <div className="custom-chat-header">
              <strong>محادثة الطلب #{chatOrder.slice(-6)}</strong>
              <button className="custom-chat-close" onClick={() => { setChatOrder(null); setChatText(''); }}>✕</button>
            </div>
            <div className="custom-chat-body">
              {orderChatMsgs(chatOrder).length === 0 && <p className="custom-chat-empty">لا توجد رسائل بعد.</p>}
              {orderChatMsgs(chatOrder).map(m => {
                const isMe = m.sender === 'customer';
                return (
                  <div key={m.id} className={`custom-chat-bubble ${isMe ? 'me' : 'them'}`}>
                    {!isMe && (
                      <div className="custom-chat-sender-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#127443', marginBottom: '0.2rem' }}>
                        {m.sender === 'driver' ? '🏍️ السائق' : '🏪 المتجر (الدعم)'}
                      </div>
                    )}
                    <div>{m.text}</div>
                    <div className="custom-chat-time">
                      {isMe && (
                        m._failed
                          ? <span title="فشل الإرسال" style={{ color: '#ef4444', fontSize: '0.65rem', marginLeft: '0.2rem' }}>⚠️</span>
                          : m.status === 'read'
                            ? <span title="مقروءة" style={{ color: '#34c759', fontSize: '0.65rem', marginLeft: '0.2rem' }}>✓✓</span>
                            : <span title="تم الإرسال" style={{ color: '#94a3b8', fontSize: '0.65rem', marginLeft: '0.2rem' }}>✓</span>
                      )}
                      {m.time}
                    </div>
                    {m._failed && (
                      <button onClick={() => retrySendMessage(m.id)} style={{ fontSize: '0.6rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        إعادة الإرسال
                      </button>
                    )}
                  </div>
                );
              })}
              {typingUsers[chatOrder] && (
                <div className="custom-chat-bubble them" style={{ opacity: 0.6 }}>
                  <div className="chat-typing-dots"><span>.</span><span>.</span><span>.</span></div>
                </div>
              )}
            </div>
            <div className="custom-chat-input">
              <input type="text" value={chatText} onChange={e => { setChatText(e.target.value); sendTyping(chatOrder, null); }}
                onKeyDown={e => { if (e.key === 'Enter') { sendMessage('customer', chatText, chatOrder); setChatText(''); } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage('customer', chatText, chatOrder); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      {orders.map(order => {
        return (
          <div key={order.id} className="order-card-mini">
            <div className="order-card-mini-top">
              <div>
                <div className="order-card-mini-id">طلب #{order.id.slice(-6)}</div>
                <div className="order-card-mini-date">{order.date ? new Date(order.date).toLocaleDateString('ar-SA') : ''}</div>
                {order.status === 'في الطريق' && order.estimatedDelivery && (
                  <div className="order-eta">🕐 وصول متوقع {formatETA(order.estimatedDelivery)}</div>
                )}
              </div>
              <span className={`order-badge ${order.status === 'جديد' ? 'badge-new' : order.status === 'قيد التحضير' ? 'badge-prep' : order.status === 'في الطريق' ? 'badge-route' : order.status === 'مكتمل' ? 'badge-done' : 'badge-cancel'}`}>
                {order.status === 'قيد التحضير' ? 'يتم تجهيز طلبك' : order.status}
              </span>
            </div>
            <div className="order-card-mini-items">
              {order.items?.slice(0, 3).map(item => <span key={item.id}>{item.name} ×{item.qty}</span>)}
              {order.items?.length > 3 && <span className="order-card-mini-more">+{order.items.length - 3} أخرى</span>}
            </div>
            <div className="order-card-mini-total">
              <strong>{order.total.toFixed(2)} ر.س</strong>
              <button className="order-chat-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة</button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ─── Account Tab ─── */
const AccountTab = memo(({ user, logout, customerProfile, updateCustomerProfile, theme, toggleTheme }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const displayName = customerProfile?.name || user?.email?.split('@')[0] || '';
  const displayPhone = customerProfile?.phone || '';
  const avatarLetter = (customerProfile?.name || user?.email || '?').charAt(0).toUpperCase();

  const startEdit = () => {
    setEditName(customerProfile?.name || '');
    setEditPhone(customerProfile?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateCustomerProfile(editName, editPhone);
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!user) return (
    <div className="account-tab">
      <div className="empty-tab">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <h3>تسجيل الدخول</h3>
        <p>سجل دخولك لمتابعة طلباتك والمزيد</p>
        <Link to="/login" className="btn" style={{ marginTop: '1rem' }}>تسجيل الدخول</Link>
        <Link to="/register" className="btn btn-ghost" style={{ marginTop: '0.5rem' }}>إنشاء حساب جديد</Link>
      </div>
      <div className="acc-contact-card">
        <div className="acc-contact-title">اتصل بنا</div>
        <div className="acc-contact-row">
          <a href={`tel:${PHONE}`} className="acc-contact-btn acc-contact-phone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>اتصال</span>
          </a>
          <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            <span>واتساب</span>
          </a>
          <a href={`mailto:${EMAIL_1}`} className="acc-contact-btn" style={{ background: '#ea4335', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span>إيميل</span>
          </a>
          <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-snap">
            <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
            <span>سناب</span>
          </a>
        </div>
      </div>
    </div>
  );

  const points = customerProfile?.loyalty_points ?? 0;

  return (
    <div className="account-tab">
      {editing ? (
        <div className="acc-card acc-edit-card">
          <h3 className="acc-section-title">تعديل البيانات</h3>
          <div className="acc-field">
            <label>الاسم الكامل</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="الاسم الكامل" className="acc-input" />
          </div>
          <div className="acc-field">
            <label>رقم الجوال</label>
            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
              placeholder="05xxxxxxxx" className="acc-input ltr" dir="ltr" />
          </div>
          <div className="acc-edit-actions">
            <button className="acc-btn acc-btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button className="acc-btn acc-btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
          </div>
        </div>
      ) : (
        <>
          <div className="acc-profile-header">
            <div className="acc-avatar-ring">
              <div className="acc-avatar">{avatarLetter}</div>
            </div>
            <div className="acc-name">{displayName}</div>
            <div className="acc-phone">{displayPhone || 'رقم الجوال غير مضاف'}</div>
            <div className="acc-email">{user.email}</div>
            <button className="acc-edit-btn" onClick={startEdit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              تعديل
            </button>
          </div>

          <div className="acc-loyalty-card">
            <div className="acc-loyalty-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#b8860b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>نقاط الولاء</span>
            </div>
            <div className="acc-loyalty-body">
              <span className="acc-loyalty-points">{points.toLocaleString()}</span>
              <span className="acc-loyalty-unit">نقطة</span>
            </div>
            <div className="acc-loyalty-footer">
              كل ريال = نقطة • استخدم النقاط في الخصومات قريبًا
            </div>
          </div>

          <div className="acc-card acc-info-card">
            <div className="acc-info-row">
              <span className="acc-info-label">تاريخ التسجيل</span>
              <span className="acc-info-value">
                {customerProfile?.created_at && !isNaN(new Date(customerProfile.created_at))
                  ? new Date(customerProfile.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'غير متاح'}
              </span>
            </div>
          </div>

          <div className="acc-theme-card" onClick={toggleTheme} role="button" tabIndex={0}>
            <div className="acc-theme-left">
              <div className="acc-theme-icon">{theme === 'light' ? '🌙' : '☀️'}</div>
              <div className="acc-theme-text">
                <span className="acc-theme-label">{theme === 'light' ? 'المظهر الداكن' : 'المظهر الفاتح'}</span>
                <span className="acc-theme-sub">{theme === 'light' ? 'بطاقات زجاجية داكنة' : 'المظهر الأبيض الافتراضي'}</span>
              </div>
            </div>
            <div className="acc-toggle-wrap">
              <div className="acc-toggle-track">
                <div className="acc-toggle-thumb" />
                <span className="acc-toggle-icon acc-toggle-sun">☀️</span>
                <span className="acc-toggle-icon acc-toggle-moon">🌙</span>
              </div>
            </div>
          </div>

          <div className="acc-contact-card">
            <div className="acc-contact-title">اتصل بنا</div>
            <div className="acc-contact-row">
              <a href={`tel:${PHONE}`} className="acc-contact-btn acc-contact-phone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>اتصال</span>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                <span>واتساب</span>
              </a>
              <a href={`mailto:${EMAIL_1}`} className="acc-contact-btn" style={{ background: '#ea4335', color: '#fff' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span>إيميل</span>
              </a>
              <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-snap">
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
                <span>سناب</span>
              </a>
            </div>
          </div>
        </>
      )}

      <button className="acc-logout-btn" onClick={logout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        تسجيل الخروج
      </button>
    </div>
  );
});

/* ─── Side Drawer ─── */
const SideDrawer = memo(({ isOpen, onClose, user, logout, tab, selectedCategory, onTabChange, setSelectedCategory, theme, toggleTheme }) => (
  <>
    <div className={`side-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
    <div className={`side-drawer ${isOpen ? 'open' : ''}`}>
      <div className="side-drawer-header">
        <img src={`${BASE}${theme === 'dark' ? 'logonaet.jpg' : 'logo222.jpg'}`} alt="ثرا" className="side-drawer-logo" onError={(e) => { e.target.src = imgFallback(80, 80, '#127443', '#FFFFFF', 'ث'); }} />
        <button className="side-drawer-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="side-drawer-items">
        <button className={`side-drawer-item ${tab === 'home' && !selectedCategory ? 'active' : ''}`} onClick={() => { onTabChange('home'); setSelectedCategory(null); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>الرئيسية</span>
        </button>
        <button className={`side-drawer-item ${selectedCategory ? 'active' : ''}`} onClick={() => { onTabChange('categories'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span>تصفح الأقسام</span>
        </button>
        <button className="side-drawer-item" onClick={() => { onTabChange('home'); setSelectedCategory('العروض'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>العروض</span>
        </button>
        <button className={`side-drawer-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => { onTabChange('orders'); onClose(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>طلباتي</span>
        </button>
        <div className="side-drawer-divider" />
        <div className="side-drawer-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <span>{theme === 'light' ? 'المظهر الداكن' : 'المظهر الفاتح'}</span>
        </div>
        <div className="side-drawer-divider" />
        <div className="side-drawer-contact-label">وسائل التواصل</div>
        <a href={`https://wa.me/${WHATSAPP_NUM}`} target="_blank" rel="noopener noreferrer" className="side-drawer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          <span>واتساب</span>
        </a>
        <a href={`tel:${PHONE}`} className="side-drawer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>اتصال</span>
        </a>
        <a href={`mailto:${EMAIL_1}`} className="side-drawer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <span>إيميل</span>
        </a>
        <a href={`https://www.snapchat.com/add/${SNAPCHAT}`} target="_blank" rel="noopener noreferrer" className="side-drawer-item">
          <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M510.846 392.673c-5.211 12.157-27.239 21.089-67.36 27.318-2.064 2.786-3.775 14.686-6.507 23.956-1.625 5.566-5.623 8.869-12.128 8.869l-.297-.005c-9.395 0-19.203-4.323-38.852-4.323-26.521 0-35.662 6.043-56.254 20.588-21.832 15.438-42.771 28.764-74.027 27.399-31.646 2.334-58.025-16.908-72.871-27.404-20.714-14.643-29.828-20.582-56.241-20.582-18.864 0-30.736 4.72-38.852 4.72-8.073 0-11.213-4.922-12.422-9.04-2.703-9.189-4.404-21.263-6.523-24.13-20.679-3.209-67.31-11.344-68.498-32.15a10.627 10.627 0 0 1 8.877-11.069c69.583-11.455 100.924-82.901 102.227-85.934.074-.176.155-.344.237-.515 3.713-7.537 4.544-13.849 2.463-18.753-5.05-11.896-26.872-16.164-36.053-19.796-23.715-9.366-27.015-20.128-25.612-27.504 2.437-12.836 21.725-20.735 33.002-15.453 8.919 4.181 16.843 6.297 23.547 6.297 5.022 0 8.212-1.204 9.96-2.171-2.043-35.936-7.101-87.29 5.687-115.969C158.122 21.304 229.705 15.42 250.826 15.42c.944 0 9.141-.089 10.11-.089 52.148 0 102.254 26.78 126.723 81.643 12.777 28.65 7.749 79.792 5.695 116.009 1.582.872 4.357 1.942 8.599 2.139 6.397-.286 13.815-2.389 22.069-6.257 6.085-2.846 14.406-2.461 20.48.058l.029.01c9.476 3.385 15.439 10.215 15.589 17.87.184 9.747-8.522 18.165-25.878 25.018-2.118.835-4.694 1.655-7.434 2.525-9.797 3.106-24.6 7.805-28.616 17.271-2.079 4.904-1.256 11.211 2.46 18.748.087.168.166.342.239.515 1.301 3.03 32.615 74.46 102.23 85.934 6.427 1.058 11.163 7.877 7.725 15.859z"/></svg>
          <span>سناب شات</span>
        </a>
      </div>
      {user && (
        <div className="side-drawer-footer">
          <button className="side-drawer-logout" onClick={() => { logout(); onClose(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  </>
));

/* ─── Notif Panel ─── */
const NotifPanel = memo(({ user, chatMessages, onClose, orders, onTabChange }) => {
  const notifLastOpened = window.localStorage.getItem('thara_notif_last_opened') || '';
  const filteredMsgs = useMemo(() => {
    if (!user) return [];
    return chatMessages.filter(m => m.customerEmail === user.email && m.sender !== 'customer' && (!m.time || m.time > notifLastOpened));
  }, [chatMessages, user, notifLastOpened]);
  const allDriverMsgs = useMemo(() => {
    if (!user) return [];
    return chatMessages.filter(m => m.customerEmail === user.email && m.sender === 'driver');
  }, [chatMessages, user]);

  React.useEffect(() => {
    window.localStorage.setItem('thara_notif_last_opened', new Date().toISOString());
  }, []);

  return (
    <>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-header">
          <h3>الإشعارات</h3>
          <button className="notif-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="notif-body">
          {!user ? (
            <div className="empty-tab">
              <h3>تسجيل الدخول</h3>
              <p>سجل دخولك لمشاهدة الإشعارات</p>
              <Link to="/login" className="btn">تسجيل الدخول</Link>
            </div>
          ) : filteredMsgs.length === 0 && allDriverMsgs.length === 0 ? (
            <div className="empty-tab">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <p>لا توجد إشعارات جديدة</p>
            </div>
          ) : (
            <>
              {filteredMsgs.map(m => (
                <div key={m.id} className="notif-item">
                  <div className="notif-item-icon">
                    {m.sender === 'driver' ? '🏍️' : '🏪'}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-sender">{m.sender === 'driver' ? 'السائق' : 'المتجر'}</div>
                    <div className="notif-item-text">{m.text}</div>
                    <div className="notif-item-time">{m.time || ''}</div>
                  </div>
                </div>
              ))}
              {allDriverMsgs.length > 0 && (
                <div className="notif-section">
                  <div className="notif-section-title">رسائل السائقين</div>
                  {orders.filter(o => o.status === 'في الطريق' || o.status === 'قيد التحضير').map(order => {
                    const driverMsgs = chatMessages.filter(m => m.orderId === order.id && m.sender === 'driver' && m.customerEmail === user?.email);
                    if (driverMsgs.length === 0) return null;
                    return (
                      <div key={order.id} className="notif-order-card" onClick={() => { onTabChange('orders'); onClose(); }}>
                        <div className="notif-order-id">طلب #{order.id.slice(-6)}</div>
                        {driverMsgs.slice(-2).map(m => (
                          <div key={m.id} className="notif-item" style={{ padding: '0.3rem 0' }}>
                            <div className="notif-item-icon" style={{ fontSize: '1rem' }}>🏍️</div>
                            <div className="notif-item-content">
                              <div className="notif-item-text">{m.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
});

/* ─── Product Card Mini ─── */
const ProductCardMini = memo(({ product, addToCart }) => {
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const handleAdd = (e) => { 
    if (outOfStock) return;
    e.stopPropagation();
    addToCart(product); 
    setAdded(true); 
    setTimeout(() => setAdded(false), 600); 
  };
  return (
    <div className="product-card-mini-item">
      <div className="mini-card-img-wrap">
        <span className="mini-card-badge-offer">%</span>
        {outOfStock && <span className="product-badge-out">نفذ</span>}
        <img src={product.imageUrl} alt={product.name} className="mini-card-img" loading="lazy"
          onError={productImgError} />
        {!outOfStock && (
          <button className={`mini-card-add ${added ? 'added' : ''}`} onClick={handleAdd}>
            {added ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </button>
        )}
      </div>
      <div className="mini-card-body">
        <div className="mini-card-name">{product.name}</div>
        <div className="mini-card-price-row">
          <div>
            <span className="mini-card-price">{product.offerPrice ? product.offerPrice.toFixed(2) : product.price.toFixed(2)}<span className="mini-card-currency"> ر.س</span></span>
            {product.offerPrice && <span className="mini-card-old-price">{product.price.toFixed(2)}</span>}
          </div>
          <div className="mini-card-unit">{product.unit}</div>
        </div>
      </div>
    </div>
  );
});

/* ─── Product Card ─── */
const ProductCard = memo(({ product, addToCart, cart }) => {
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
  // حساب الكمية في السلة
  const cartItem = cart?.find(item => item.id === product.id);
  const cartQty = cartItem?.qty || 0;
  const handleAdd = (e) => { if (outOfStock) return; e?.stopPropagation(); addToCart(product); setAdded(true); setTimeout(() => setAdded(false), 600); };
  return (
    <div className="product-card-new">
      <div className="product-card-new-img-wrap">
        {product.isOffer && <span className="product-badge-offer">%</span>}
        {outOfStock && <span className="product-badge-out">نفذ</span>}
        {lowStock && <span className="product-badge-low">بقية {product.stock_quantity}</span>}
        <img src={product.imageUrl} alt={product.name} className="product-card-new-img" loading="lazy"
          onError={productImgError} />
        {!outOfStock && (
          <div className="product-card-new-actions">
            {/* شارة الكمية في السلة */}
            {cartQty > 0 && (
              <span className="product-card-cart-qty">{cartQty}</span>
            )}
            <button className={`product-card-new-add ${added ? 'added' : ''}`} onClick={handleAdd}>
              {added ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              )}
            </button>
          </div>
        )}
      </div>
      <div className="product-card-new-body">
        <div className="product-card-new-cat">{product.category}</div>
        <div className="product-card-new-name">{product.name}</div>
        <div className="product-card-new-price-row">
          <div className="product-card-new-price">
            {product.isOffer ? (
              <><span className="offer-old">{product.price.toFixed(2)}</span> {product.offerPrice.toFixed(2)}</>
            ) : product.price.toFixed(2)}
            <span className="product-card-new-currency"> ر.س</span>
          </div>
          <div className="product-card-new-unit">{product.unit}</div>
        </div>
      </div>
    </div>
  );
});

/* ─── Support & WhatsApp Floating Action Widget ─── */
const SupportChatWidget = memo(() => {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, user } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [lastOpenedSupport, setLastOpenedSupport] = useState(() => localStorage.getItem('thara_support_last_opened') || '');
  const chatBodyRef = useRef(null);
  const typingTimer = useRef(null);

  // Group and filter support messages for this customer
  const supportMessages = useMemo(() => {
    if (!user) return [];
    return chatMessages.filter(m => !m.orderId && m.customerEmail === user.email);
  }, [chatMessages, user]);

  // Count unread support messages from admin
  const unreadCount = useMemo(() => {
    if (!user || isOpen) return 0;
    const adminMsgs = chatMessages.filter(m => !m.orderId && m.customerEmail === user.email && m.sender === 'admin' && m.status !== 'read');
    if (!lastOpenedSupport) return adminMsgs.length;
    return adminMsgs.filter(m => {
      const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      const lastTime = new Date(lastOpenedSupport).getTime();
      return msgTime > lastTime;
    }).length;
  }, [chatMessages, user, lastOpenedSupport, isOpen]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isOpen) {
      const nowStr = new Date().toISOString();
      localStorage.setItem('thara_support_last_opened', nowStr);
      setLastOpenedSupport(nowStr);
      const unreadIds = supportMessages.filter(m => m.sender === 'admin' && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0) markMessagesAsRead(unreadIds);
    }
  }, [isOpen, supportMessages]);

  // Auto-scroll chat body
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [isOpen, supportMessages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage('customer', inputText.trim());
    setInputText('');
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTyping(null, user?.email);
  };

  const adminIsTyping = user && typingUsers[user.email] && supportMessages.length > 0;

  const StatusIcon = ({ status, failed }) => {
    if (failed) return <span title="فشل الإرسال" style={{ color: '#ef4444', fontSize: '0.65rem', marginRight: '0.2rem' }}>⚠️</span>;
    if (status === 'read') return <span title="مقروءة" style={{ color: '#34c759', fontSize: '0.65rem', marginRight: '0.2rem' }}>✓✓</span>;
    if (status === 'sent') return <span title="تم الإرسال" style={{ color: '#94a3b8', fontSize: '0.65rem', marginRight: '0.2rem' }}>✓</span>;
    return null;
  };

  const phone = WHATSAPP_NUM;
  const whatsappMsg = encodeURIComponent('السلام عليكم، أحتاج مساعدة بخصوص الطلب.');
  const whatsappUrl = `https://wa.me/${phone}?text=${whatsappMsg}`;

  return (
    <div className="chat-widgets-container" style={{
      position: 'fixed', bottom: '80px', left: '0.25rem', zIndex: 300,
      display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center'
    }}>
      {/* WhatsApp Button */}
      <a
        className="chat-fab whatsapp-fab"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        title="تواصل عبر واتساب"
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)', color: 'white', transition: 'transform 0.2s',
          border: 'none', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
          <path d="M19.11 17.38c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.7.3 1.25.48 1.68.62.7.22 1.33.2 1.83.12.56-.08 1.77-.72 2.02-1.43.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
          <path d="M16.03 3.2c-7.08 0-12.83 5.75-12.83 12.83 0 2.26.6 4.47 1.73 6.4L3 29l6.73-1.77a12.8 12.8 0 0 0 6.3 1.6h.01c7.08 0 12.83-5.75 12.83-12.83 0-3.43-1.33-6.65-3.76-9.08A12.75 12.75 0 0 0 16.03 3.2zm0 23.33h-.01c-1.93 0-3.82-.52-5.46-1.5l-.4-.24-3.99 1.05 1.07-3.9-.26-.4a10.48 10.48 0 0 1-1.61-5.55c0-5.8 4.72-10.52 10.53-10.52 2.8 0 5.43 1.1 7.41 3.08a10.45 10.45 0 0 1 3.08 7.43c0 5.8-4.73 10.52-10.53 10.52z"/>
        </svg>
      </a>

      {/* In-App Live Chat Button */}
      <button
        className="chat-fab support-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="الدعم الفني المباشر"
        title="الدعم الفني المباشر"
        style={{
          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
          background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(251, 191, 38, 0.35)', color: '#78350f', cursor: 'pointer',
          position: 'relative', transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '1rem' }}>💬</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            background: '#ff3b30', color: 'white', fontSize: '0.6rem', fontWeight: 800,
            width: '14px', height: '14px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)', border: '1.5px solid #fbbf24'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Support Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-win-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759', display: 'inline-block', animation: 'pulse-prep 1.5s infinite' }} />
              <span>الدعم الفني المباشر</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
          </div>

          {!user ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', textAlign: 'center', gap: '1rem'
            }}>
              <span style={{ fontSize: '2.5rem' }}>🔒</span>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                تواصل مع الدعم الفني مباشرة وبخصوصية تامة! يرجى تسجيل الدخول للبدء.
              </p>
              <Link
                to="/login"
                className="acc-btn acc-btn-primary"
                onClick={() => setIsOpen(false)}
                style={{
                  textDecoration: 'none', display: 'inline-block', width: 'auto',
                  padding: '0.65rem 1.5rem', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem'
                }}
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <div ref={chatBodyRef} className="chat-win-body">
                {supportMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                    👋 أهلاً بك! اكتب رسالتك هنا وسيقوم فريق الدعم بالرد عليك في أقرب وقت.
                  </div>
                )}
                {supportMessages.map(m => (
                  <div key={m.id} className={`chat-bubble ${m.sender === 'customer' ? 'me' : 'them'}`}>
                    <div>{m.text}</div>
                    <div className="chat-time">
                      {m.sender === 'customer' && <StatusIcon status={m.status} failed={m._failed} />}
                      {m.time}
                    </div>
                    {m._failed && (
                      <button
                        onClick={() => retrySendMessage(m.id)}
                        style={{ fontSize: '0.65rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        إعادة الإرسال
                      </button>
                    )}
                  </div>
                ))}
                {adminIsTyping && (
                  <div className="chat-bubble them" style={{ opacity: 0.6 }}>
                    <div className="chat-typing-dots"><span>.</span><span>.</span><span>.</span></div>
                  </div>
                )}
              </div>

              <div className="chat-win-input">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب استفسارك هنا..."
                />
                <button onClick={handleSend}>إرسال</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

/* ─── Khafji Map ─── */
const KhafjiMap = memo(({ position, setPosition }) => {
  const mapRef = useRef(null);
  const inst = useRef(null);
  const marker = useRef(null);
  const locating = useRef(false);

  useEffect(() => {
    if (inst.current) return;
    const map = L.map(mapRef.current, { center: [28.4355, 48.4988], zoom: 13, minZoom: 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.on('click', (e) => {
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

  // If position is set from UI (search), reflect it on the map.
  useEffect(() => {
    if (!position) return;
    syncMarker(position);
  }, [position, syncMarker]);
  const locate = useCallback(() => {
    if (!navigator.geolocation || locating.current) return;
    locating.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating.current = false;
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        syncMarker(p);
        setPosition(p);
      },
      () => { locating.current = false; },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);
  useEffect(() => {
    if (!inst.current) return;
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
      <button className="locate-btn" onClick={locate} title="تحديد موقعي">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
      </button>
    </div>
  );
});

/* ─── Checkout ─── */
const KHAFJI_BOUNDS = { minLat: 28.35, maxLat: 28.50, minLng: 48.40, maxLng: 48.55 };
const isInKhafji = (pos) => pos && pos.lat >= KHAFJI_BOUNDS.minLat && pos.lat <= KHAFJI_BOUNDS.maxLat && pos.lng >= KHAFJI_BOUNDS.minLng && pos.lng <= KHAFJI_BOUNDS.maxLng;

const CheckoutModal = memo(({ cartTotal, onClose, placeOrder }) => {
  const { user } = useContext(StoreContext);
  const [position, setPosition] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mada');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [areaResults, setAreaResults] = useState([]);
  const [areaSearching, setAreaSearching] = useState(false);
  const [areaErr, setAreaErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fee = cartTotal >= 100 ? 0 : 15;
  const outside = position && !isInKhafji(position);
  const phoneReady = /^05\d{8}$/.test(phone.trim());

  const quickNeighborhoods = [
    'العزيزية',
    'الفيصلية',
    'النهضة',
    'الروضة',
    'السلام',
    'الخالدية',
    'اليرموك',
    'الخفجي',
  ];

  const fetchAreaSuggestions = useCallback(async (q) => {
    const query = String(q || '').trim();
    if (!query) { setAreaResults([]); setAreaErr(''); return; }
    setAreaSearching(true);
    setAreaErr('');
    try {
      const viewbox = `${KHAFJI_BOUNDS.minLng},${KHAFJI_BOUNDS.maxLat},${KHAFJI_BOUNDS.maxLng},${KHAFJI_BOUNDS.minLat}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ar&countrycodes=sa&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(query + ' الخفجي')}`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await r.json();
      const mapped = Array.isArray(data) ? data.map(x => ({
        display: x.display_name,
        lat: parseFloat(x.lat),
        lng: parseFloat(x.lon),
      })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng)) : [];
      setAreaResults(mapped);
      if (mapped.length === 0) setAreaErr('لا توجد نتائج داخل الخفجي');
    } catch {
      setAreaErr('تعذر البحث حالياً');
    } finally {
      setAreaSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchAreaSuggestions(areaQuery), 250);
    return () => clearTimeout(t);
  }, [areaQuery, fetchAreaSuggestions]);

  const pickArea = useCallback((r) => {
    setPosition({ lat: r.lat, lng: r.lng });
    setAreaResults([]);
  }, []);
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
            <p className="checkout-hint">سيتم تحديد موقعك تلقائياً — يمكنك التعديل بالنقر على الخريطة</p>
            <div className="checkout-area-search">
              <div className="checkout-area-search-row">
                <input
                  className="checkout-area-input"
                  value={areaQuery}
                  onChange={(e) => setAreaQuery(e.target.value)}
                  placeholder="ابحث عن حي/منطقة داخل الخفجي"
                />
                <button
                  type="button"
                  className="checkout-area-btn"
                  onClick={() => fetchAreaSuggestions(areaQuery)}
                  disabled={areaSearching || !areaQuery.trim()}
                >
                  {areaSearching ? '...' : 'بحث'}
                </button>
              </div>
              <div className="checkout-area-quick">
                {quickNeighborhoods.map(n => (
                  <button key={n} type="button" className="checkout-area-chip" onClick={() => setAreaQuery(n)}>
                    {n}
                  </button>
                ))}
              </div>
              {areaErr && <div className="checkout-area-err">{areaErr}</div>}
              {areaResults.length > 0 && (
                <div className="checkout-area-results">
                  {areaResults.map((r, i) => (
                    <button key={i} type="button" className="checkout-area-item" onClick={() => pickArea(r)}>
                      {r.display}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={`checkout-map ${position ? '' : 'checkout-map-empty'}`}>
              <KhafjiMap position={position} setPosition={setPosition} />
            </div>
            {position && <div className="checkout-confirmed">✓ تم تحديد الموقع</div>}
            {outside && <div className="checkout-outside">⚠️ الموقع خارج الخفجي — سيتم التواصل معك لتأكيد إمكانية ووقت التوصيل</div>}
          </div>
          {['stc', 'barq', '360'].includes(paymentMethod) && (
            <div className="checkout-section">
              <div className="checkout-section-title"><span className="checkout-num">2</span> رقم الجوال المستلم للتحويل</div>
              <input className="checkout-phone-input" type="tel" dir="ltr" value={PHONE_DISPLAY} readOnly />
            </div>
          )}
          {paymentMethod === 'bank_transfer' && (
            <div className="checkout-section">
              <div className="checkout-section-title"><span className="checkout-num">2</span> رقم IBAN للتحويل البنكي</div>
              <input className="checkout-phone-input" type="text" dir="ltr" value="SA1234567890123456789012" readOnly />
            </div>
          )}
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">{['stc', 'barq', '360', 'bank_transfer'].includes(paymentMethod) ? '3' : '2'}</span> بيانات التواصل</div>
            <input
              className="checkout-phone-input"
              type="tel"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              maxLength={10}
            />
            <textarea
              className="checkout-notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات الطلب، مثل رقم الشقة أو وقت التوصيل المناسب"
              rows="3"
            />
          </div>
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">{['stc', 'barq', '360', 'bank_transfer'].includes(paymentMethod) ? '4' : '3'}</span> طريقة الدفع</div>
            <div className="checkout-payments">
              {[
                { id: 'mada', label: 'مدى', icon: '💳' },
                { id: 'stc', label: 'STC Pay', icon: '📱' },
                { id: 'barq', label: 'بنك برق', icon: '💳' },
                { id: '360', label: 'بنك 360', icon: '🔄' },
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
<button className="checkout-confirm-btn" onClick={async () => {
  if (submitting || !position || !phoneReady) return;
  if (!user) {
    showToast('يجب تسجيل الدخول لإتمام الطلب', 'error');
    return;
  }
  setSubmitting(true);
  try {
    await placeOrder({
      location: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`,
      paymentMethod,
      phone: phone.trim(),
      notes: `${notes.trim()}${outside ? (notes.trim() ? ' — ' : '') + 'ملاحظة: الموقع خارج الخفجي' : ''}`
    });
  } catch (e) {
    showToast(e?.message || 'فشل إرسال الطلب', 'error');
    setSubmitting(false);
    return;
  }
  onClose();
}} disabled={submitting || !position || !phoneReady || !user}>{submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}</button>
        </div>
      </div>
    </div>
  );
});
