import { useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { StoreContext } from './context/StoreContext';
import L from 'leaflet';
import CheckoutModal from './components/CheckoutModal';
import SupportChatWidget from './components/SupportChatWidget';
import CartScreen from './components/CartScreen';
import SideDrawer from './components/SideDrawer';
import NotifPanel from './components/NotifPanel';
import SplashScreen from './components/SplashScreen';
import UpdateBanner from './components/UpdateBanner';
import AppHeader from './components/AppHeader';
import AppTabbar from './components/AppTabbar';
import HomeTab from './components/HomeTab';
import CategoriesTab from './components/CategoriesTab';
import OrdersTab from './components/OrdersTab';
import AccountTab from './components/AccountTab';
import AllProductsView from './components/AllProductsView';
import AddToHomeScreen from './components/AddToHomeScreen';
import { BASE } from './utils/constants';

L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

export default function App() {
  const { products, cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    placeOrder, user, logout, orders,
    customerProfile, updateCustomerProfile, loadOrders,
    chatMessages, staffRole } = useContext(StoreContext);

  const [tab, setTab] = useState('home');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slideDir, setSlideDir] = useState('left');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showAllView, setShowAllView] = useState(null);
  const [prevTab, setPrevTab] = useState('home');
  const [showAddToHome, setShowAddToHome] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1220' : '#127443');
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      const { name } = e.detail || {};
      try {
        if (Notification.permission === 'granted') {
          new Notification('🔥 عرض جديد في ثراء الشرق ون!', { body: `اطلع على ${name || 'العرض الجديد'} الآن`, icon: '/icon-192.png' });
        }
      } catch {}
    };
    window.addEventListener('thara:new-offer', handler);
    return () => window.removeEventListener('thara:new-offer', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 4400); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('sw-update', handler);
    return () => window.removeEventListener('sw-update', handler);
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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
      (m.customerEmail === user.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)) &&
      m.sender !== 'customer'
    );
    if (!notifLastOpened) return relevant.length;
    const lastTime = new Date(notifLastOpened).getTime();
    return relevant.filter(m => {
      const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      return msgTime > lastTime;
    }).length;
  }, [chatMessages, user, customerProfile, notifLastOpened]);

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
          {tab === 'home' && <HomeTab key="home" products={products}
            addToCart={addToCart} cart={cart} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            setShowAllView={setShowAllView} />}
        </div>
        )}
        <div className={`app-slide ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
          {tab === 'categories' && <CategoriesTab key="categories" />}
          {tab === 'orders' && <OrdersTab key="orders" orders={userOrders} loadOrders={loadOrders} />}
          {tab === 'account' && <AccountTab key="account" user={user} logout={logout} customerProfile={customerProfile} updateCustomerProfile={updateCustomerProfile} theme={theme} toggleTheme={toggleTheme} staffRole={staffRole} />}
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
        theme={theme} toggleTheme={toggleTheme}
        onShareClick={() => { setIsDrawerOpen(false); setShowAddToHome(true); }} />

      {isNotifOpen && <NotifPanel user={user} chatMessages={chatMessages}
        onClose={() => setIsNotifOpen(false)}
        orders={orders} onTabChange={switchTab} />}

      <AddToHomeScreen isOpen={showAddToHome} onClose={() => setShowAddToHome(false)} />

      <SupportChatWidget />
    </div>
  );
}
