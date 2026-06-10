import { useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { StoreContext } from './context/StoreContext';
import InstallPrompt from './components/InstallPrompt';
import CheckoutModal from './components/CheckoutModal';
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

import OfflineBanner from './components/OfflineBanner';
import { BASE } from './utils/constants';
import { useTheme } from './utils/theme';


export default function App() {
  const { products, cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    placeOrder, user, logout, orders,
    customerProfile, updateCustomerProfile, loadOrders,
    chatMessages, staffRole, currentStaff } = useContext(StoreContext);

  const [tab, setTab] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slideDir, setSlideDir] = useState('left');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [showAllView, setShowAllView] = useState(null);
  const [preselectedCat, setPreselectedCat] = useState(null);
  const [prevTab, setPrevTab] = useState('home');
  const [tabKey, setTabKey] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      const { name } = e.detail || {};
      try {
        if (Notification.permission === 'granted') {
          new Notification('🔥 عرض جديد في أسواق ثراء الشرق ون!', { body: `اطلع على ${name || 'العرض الجديد'} الآن`, icon: BASE + 'icon-192.png' });
        }
      } catch (e) { console.error('new-offer notification error', e); }
    };
    window.addEventListener('thara:new-offer', handler);
    return () => window.removeEventListener('thara:new-offer', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2500); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch((e) => console.error('Notif permission request failed', e));
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
        if (order.status === 'قيد التحضير') body = 'تم استلام طلبك وجاري تجهيزه';
        else if (order.status === 'جاهز للتوصيل') body = 'طلبك جاهز بانتظار الكابتن';
      else if (order.status === 'في الطريق') {
          const eta = order.estimatedDelivery;
          body = eta ? `الكابتن في الطريق — الوصول خلال ${eta} دقيقة` : 'الكابتن في الطريق إليك';
        } else if (order.status === 'تم التوصيل') body = 'تم توصيل طلبك ✓، بانتظار تأكيد الإدارة';
        else if (order.status === 'مكتمل') body = '🎉 تم التوصيل بنجاح';
        else body = `تحديث الطلب: ${order.status}`;
        new Notification('أسواق ثراء الشرق ون', { body, tag: 'thara-order', lang: 'ar', icon: BASE + 'cart-icon-192.png' });
      } catch (e) { console.error('order-status notification error', e); }
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

  const cartCount = (cart || []).reduce((s, i) => s + i.qty, 0);
  const userOrders = (orders || []).filter(o => o.customerEmail === user?.email);
  const notifLastOpened = (() => { try { return localStorage.getItem('thara_notif_last_opened') || ''; } catch (e) { console.error('read notifLastOpened', e); return ''; } })();
  const unreadNotifs = useMemo(() => {
    if (!user) return 0;
    const relevant = (chatMessages || []).filter(m =>
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
    const order = ['home', 'categories', 'orders', 'account'];
    const curIdx = order.indexOf(tab);
    const nextIdx = order.indexOf(t);
    if (nextIdx === -1) return;
    if (curIdx === nextIdx) { setTabKey(k => k + 1); return; }
    if (t !== 'home') setShowAllView(null);
    setSlideDir(nextIdx > curIdx ? 'left' : 'right');
    setPrevTab(tab);
    setTab(t);
  }, [tab]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-wrapper">
      <UpdateBanner />
      <OfflineBanner />
      <InstallPrompt />
      <AppHeader cartCount={cartCount} user={user} logout={logout}
        onCartOpen={() => setIsCartOpen(true)} tab={tab}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        unreadNotifs={unreadNotifs}
        theme={theme}
        onMenuClick={() => setIsDrawerOpen(true)}
        onThemeChange={setTheme}
        onNotifClick={() => { setIsDrawerOpen(false); setIsNotifOpen(o => !o); }} />

        <div className={`app-content ${tab === 'home' && !showAllView ? '' : 'app-content-nohome'}`}>
        {showAllView ? (
          <AllProductsView view={showAllView} onBack={() => setShowAllView(null)}
            products={products} addToCart={addToCart} cart={cart} />
        ) : (
        <div className={`app-slide ${slideDir === 'left' ? 'slide-in-left' : 'slide-in-right'}`}>
          {tab === 'home' && <HomeTab key="home" products={products}
            addToCart={addToCart} cart={cart} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            setShowAllView={setShowAllView}
            onSelectCategory={(cat) => { setPreselectedCat(cat); switchTab('categories'); }} />}
        </div>
        )}
        <div className={`app-slide ${slideDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`}>
          {tab === 'categories' && <CategoriesTab key={`categories-${tabKey}`}
            preselectedCat={preselectedCat} setPreselectedCat={setPreselectedCat} />}
          {tab === 'orders' && <OrdersTab key="orders" orders={userOrders} loadOrders={loadOrders} />}
          {tab === 'account' && <AccountTab key="account" user={user} logout={logout} customerProfile={customerProfile} updateCustomerProfile={updateCustomerProfile} theme={theme} toggleTheme={toggleTheme} staffRole={staffRole} currentStaff={currentStaff} orders={userOrders} />}
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
    </div>
  );
}
