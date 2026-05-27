import React, { useContext, useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext, useStore } from './context/StoreContext';
import { categories } from './data/mockData';
import L from 'leaflet';
import InstallPrompt from './components/InstallPrompt';

const BASE = import.meta.env.BASE_URL || '/';

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

function imgFallback(w, h, bg, fg, text) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + bg + '" width="' + w + '" height="' + h + '"/><text fill="' + fg + '" font-family="sans-serif" font-size="' + Math.min(w, h) / 6 + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + text + '</text></svg>');
}
const logoPath = BASE + 'LOGO.jpg';
function productImgError(e) { if (e.target.src !== logoPath) e.target.src = logoPath; }

export default function App() {
  const { products, cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    placeOrder, user, logout, orders,
    customerProfile, updateCustomerProfile, loadOrders } = useContext(StoreContext);

  const [tab, setTab] = useState('home');
  const [prevTab, setPrevTab] = useState('home');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slideDir, setSlideDir] = useState('left');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1220' : '#127443');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

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
          {tab === 'orders' && <OrdersTab key="orders" orders={userOrders} loadOrders={loadOrders} />}
          {tab === 'account' && <AccountTab key="account" user={user} logout={logout} customerProfile={customerProfile} updateCustomerProfile={updateCustomerProfile} theme={theme} toggleTheme={toggleTheme} />}
        </div>
      </div>

      <AppTabbar tab={tab} onTabChange={switchTab} cartCount={cartCount} />

      {isCartOpen && <CartScreen cart={cart} cartTotal={cartTotal} cartCount={cartCount}
        updateCartQty={updateCartQty} removeFromCart={removeFromCart}
        onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />}

      {isCheckoutOpen && <CheckoutModal cartTotal={cartTotal} onClose={() => setIsCheckoutOpen(false)} placeOrder={placeOrder} />}

      <WhatsAppFab />
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

/* ─── Home Tab ─── */
const HomeTab = memo(({ products, selectedCategory, setSelectedCategory, addToCart, cartCount, setIsCartOpen }) => {
  const [showBanner, setShowBanner] = useState(true);
  const { allProducts } = useStore();

  const offerProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => p.isOffer);
  }, [allProducts]);

  const bestSellerProducts = useMemo(() => {
    return products.slice(0, 6);
  }, [products]);

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

      {/* 2. Store Categories Section Card */}
      <div className="home-section-card categories-card">
        <div className="section-card-header">
          <div className="section-card-title-group">
            <span className="section-card-icon">🛍️</span>
            <h3 className="section-card-title">أقسام المتجر</h3>
          </div>
        </div>

        <div className="categories-scroll">
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

      {/* 3. Special Offers Section Card (Horizontal Scroll) */}
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
      {/* 4. Products Grid Section Card */}
      {selectedCategory === 'الكل' ? (
        <div className="home-section-card products-list-card">
          <div className="section-card-header">
            <div className="section-card-title-group">
              <span className="section-card-icon">🥬</span>
              <h3 className="section-card-title">أكثر من 15000 صنف في مكان واحد</h3>
            </div>
            <span className="products-count-badge">أكثر من 15000 صنف</span>
          </div>
          <div className="products-horizontal-scroll">
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
      ) : (
        <div className="vertical-products-list">
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
      )}

      {selectedCategory === 'الكل' && bestSellerProducts.length > 0 && (
        <div className="home-section-card bestsellers-card">
          <div className="section-card-header">
            <div className="section-card-title-group">
              <span className="section-card-icon">🏆</span>
              <h3 className="section-card-title">الأكثر مبيعا</h3>
            </div>
            <span className="section-card-action-link" onClick={() => setSelectedCategory('الكل')}>عرض الكل</span>
          </div>
          <div className="offers-horizontal-scroll">
            {bestSellerProducts.map(product => (
              <ProductCardMini key={`bestseller-${product.id}`} product={product} addToCart={addToCart} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/* ─── Orders Tab ─── */
const OrdersTab = memo(({ orders, loadOrders }) => {
  const { chatMessages, sendMessage } = useContext(StoreContext);
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
                    <div className="custom-chat-time">{m.time}</div>
                  </div>
                );
              })}
            </div>
            <div className="custom-chat-input">
              <input type="text" value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { sendMessage('customer', chatText, chatOrder); setChatText(''); } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage('customer', chatText, chatOrder); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      {orders.map(order => (
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
      ))}
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
          <a href="tel:0555555555" className="acc-contact-btn acc-contact-phone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>اتصال</span>
          </a>
          <a href="https://wa.me/966555555555" target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            <span>واتساب</span>
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
                <a href="tel:0555555555" className="acc-contact-btn acc-contact-phone">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>اتصال</span>
                </a>
                <a href="https://wa.me/966555555555" target="_blank" rel="noopener noreferrer" className="acc-contact-btn acc-contact-whatsapp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  <span>واتساب</span>
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

/* ─── Product Card Emoji Helper ─── */
const getCategoryEmoji = (category) => {
  switch (category) {
    case 'الكل': return '🏪';
    case 'العروض': return '🔥';
    case 'بحث سريع': return '🔎';
    case 'بقالة وجاهز': return '🛒';
    case 'ثلاجة ومجمدات': return '❄️';
    case 'منظفات ومنزل': return '🧹';
    case 'مشروبات وحلويات': return '🥤';
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
const ProductCard = memo(({ product, addToCart }) => {
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
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
          <button className={`product-card-new-add ${added ? 'added' : ''}`} onClick={handleAdd}>
            {added ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </button>
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

/* ─── WhatsApp Floating Action ─── */
const WhatsAppFab = memo(() => {
  const phone = '966555555555';
  const message = encodeURIComponent('السلام عليكم، أحتاج مساعدة بخصوص الطلب.');
  const href = `https://wa.me/${phone}?text=${message}`;
  return (
    <div className="chat-widget">
      <a
        className="chat-fab whatsapp-fab"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        title="تواصل عبر واتساب"
      >
        <svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.38c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.7.3 1.25.48 1.68.62.7.22 1.33.2 1.83.12.56-.08 1.77-.72 2.02-1.43.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
          <path d="M16.03 3.2c-7.08 0-12.83 5.75-12.83 12.83 0 2.26.6 4.47 1.73 6.4L3 29l6.73-1.77a12.8 12.8 0 0 0 6.3 1.6h.01c7.08 0 12.83-5.75 12.83-12.83 0-3.43-1.33-6.65-3.76-9.08A12.75 12.75 0 0 0 16.03 3.2zm0 23.33h-.01c-1.93 0-3.82-.52-5.46-1.5l-.4-.24-3.99 1.05 1.07-3.9-.26-.4a10.48 10.48 0 0 1-1.61-5.55c0-5.8 4.72-10.52 10.53-10.52 2.8 0 5.43 1.1 7.41 3.08a10.45 10.45 0 0 1 3.08 7.43c0 5.8-4.73 10.52-10.53 10.52z"/>
        </svg>
      </a>
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
  const [position, setPosition] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mada');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [areaResults, setAreaResults] = useState([]);
  const [areaSearching, setAreaSearching] = useState(false);
  const [areaErr, setAreaErr] = useState('');
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
              <input className="checkout-phone-input" type="tel" dir="ltr" value="0555555555" readOnly />
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
          <button className="checkout-confirm-btn" onClick={() => {
            if (!position || !phoneReady) return;
            placeOrder({
              location: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`,
              paymentMethod,
              phone: phone.trim(),
              notes: `${notes.trim()}${outside ? (notes.trim() ? ' — ' : '') + 'ملاحظة: الموقع خارج الخفجي' : ''}`
            });
            onClose();
          }} disabled={!position || !phoneReady}>تأكيد الطلب</button>
        </div>
      </div>
    </div>
  );
});
