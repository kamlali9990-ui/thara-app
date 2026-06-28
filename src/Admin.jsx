import React, { useContext, useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback, startTransition } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { supabase } from './supabase/client';
import { showToast } from './components/Toast.jsx';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './utils/theme';
import { safeProductUrl } from './utils/constants';


const AdminOrders = lazy(() => import('./components/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./components/admin/AdminProducts'));
const AdminOffers = lazy(() => import('./components/admin/AdminOffers'));
const AdminChat = lazy(() => import('./components/admin/AdminChat'));
const AdminCleanup = lazy(() => import('./components/admin/AdminCleanup'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const StaffManager = lazy(() => import('./components/StaffManager.jsx'));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings'));
const AdminStats = lazy(() => import('./components/admin/AdminStats'));
const PermissionManager = lazy(() => import('./components/admin/PermissionManager'));
const AdminInstructions = lazy(() => import('./components/admin/AdminInstructions'));
const AdminDiagnostics = lazy(() => import('./components/admin/AdminDiagnostics'));
const AdminCategoryImages = lazy(() => import('./components/admin/AdminCategoryImages'));
const DriverOrders = lazy(() => import('./components/admin/DriverOrders'));


function playNewOrderBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
  } catch {}
}

function notifyNewOrder(order) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const total = order?.total != null ? Number(order.total).toFixed(2) + ' ر.س' : '';
    new Notification('طلب جديد', {
      body: `طلب رقم ${(order?.id || '').toString().slice(-6)} — ${total}`,
      tag: 'thara-new-order',
      icon: (import.meta.env.BASE_URL || '/') + 'cart-icon-192.png',
      lang: 'ar'
    });
  } catch {}
}

function notifyNewMessage(msg) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const preview = msg?.text ? (msg.text.length > 80 ? msg.text.slice(0, 80) + '...' : msg.text) : 'رسالة صوتية';
    new Notification('رسالة جديدة من عميل', {
      body: preview,
      tag: 'thara-new-msg-' + (msg?.id || 'x'),
      icon: (import.meta.env.BASE_URL || '/') + 'cart-icon-192.png',
      lang: 'ar'
    });
  } catch {}
}

function TabIcon({ name, badge, size = 22 }) {
  const icons = {
    orders: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>,
    chat: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    store: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="12" x2="14" y2="12"/><line x1="18" y1="16" x2="22" y2="16"/></svg>,
    staff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    cleanup: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    myactivity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4M17 17h2v-4"/><path d="M9 17h6"/><path d="M3 10h8V6l4 2 2 4 3-1"/></svg>,
    instructions: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    diagnostics: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
    images: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  };
  return (
    <span className="admin-nav-icon">
      {icons[name] || null}
      {badge != null && badge > 0 && <span className="admin-nav-badge">{badge > 99 ? '99+' : badge}</span>}
    </span>
  );
}

export default function Admin() {
  const {
    allProducts, orders, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    chatMessages, sendMessage, logout, staffRole, currentStaff,
    allCustomers, loadCustomers, loadOrders, staffList,
    drivers, assignDriverToOrder, claimOrder, loadDrivers,
    hasPermission
  } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [storeTab, setStoreTab] = useState('products');
  const [settingsTab, setSettingsTab] = useState('main');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordChangeWithVerify, setPasswordChangeWithVerify] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/admin/login');
  }, [logout, navigate]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (staffRole !== 'driver') return;
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email) return;
      if (localStorage.getItem(`thara_driver_password_prompt_dismissed_${email}`) === '1') return;
      setShowPasswordPrompt(true);
    };
    init();
  }, [staffRole]);

  const handleSkipPasswordChange = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
    setShowPasswordPrompt(false);
    setPasswordChangeWithVerify(false);
  }, []);

  const handlePasswordChange = useCallback(async () => {
    if (newPassword.length < 8) { showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) { showToast('يجب أن تحتوي كلمة المرور على حروف كبيرة وصغيرة وأرقام', 'warning'); return; }
    if (newPassword !== confirmPassword) { showToast('كلمتا المرور غير متطابقتين', 'warning'); return; }
    setPasswordLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (signInError) { showToast('كلمة المرور الحالية غير صحيحة', 'error'); setPasswordLoading(false); return; }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
      setShowPasswordPrompt(false);
      setNewPassword(''); setConfirmPassword(''); setCurrentPassword('');
      showToast('تم تحديث كلمة المرور بنجاح', 'success');
    } catch (err) {
      showToast('فشل تحديث كلمة المرور: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally { setPasswordLoading(false); }
  }, [newPassword, confirmPassword, currentPassword]);

  const isAdminOrManager = staffRole === 'admin' || staffRole === 'manager';
  const isDriver = staffRole === 'driver';

  useEffect(() => {
    if (!loadOrders) return;
    loadOrders();
    if (isAdminOrManager || isDriver) { try { loadDrivers(); } catch (e) { console.error('loadDrivers', e); } }
  }, [loadOrders, staffRole, loadDrivers]);

  useEffect(() => {
    try { Notification.requestPermission().catch(() => {}); } catch {}
    const orderHandler = (e) => { playNewOrderBeep(); notifyNewOrder(e.detail); };
    window.addEventListener('thara:new-order', orderHandler);
    const msgHandler = (e) => { notifyNewMessage(e.detail); };
    window.addEventListener('thara:new-message', msgHandler);
    return () => {
      window.removeEventListener('thara:new-order', orderHandler);
      window.removeEventListener('thara:new-message', msgHandler);
    };
  }, []);

  const newOrdersCount = useMemo(() => orders.filter(o => o.status === 'جديد').length, [orders]);
  const unreadChatCount = useMemo(() => {
    return chatMessages.filter(m => m.status !== 'read' && m.sender !== staffRole && m.sender !== 'system').length;
  }, [chatMessages, staffRole]);

  const tabs = useMemo(() => {
    const items = [{ id: 'orders', label: 'الطلبات', icon: 'orders', badge: newOrdersCount }];
    if (hasPermission('manage_chat')) items.push({ id: 'chat', label: 'العملاء', icon: 'chat', badge: unreadChatCount });
    if (isDriver) items.push({ id: 'myactivity', label: 'نشاطي', icon: 'myactivity' });
    if (hasPermission('manage_products') || hasPermission('manage_offers')) {
      items.push({ id: 'store', label: 'المتجر', icon: 'store' });
    }
    if (hasPermission('manage_settings')) {
      items.push({ id: 'settings', label: 'الإعدادات', icon: 'settings' });
    }
    if (hasPermission('manage_staff')) items.push({ id: 'staff', label: 'الموظفين', icon: 'staff' });
    if (staffRole === 'admin') items.push({ id: 'cleanup', label: 'التنظيف', icon: 'cleanup' });
    items.push({ id: 'diagnostics', label: 'إصلاح المتصفح', icon: 'diagnostics' });
    items.push({ id: 'instructions', label: 'تعليمات', icon: 'instructions' });
    return items;
  }, [newOrdersCount, unreadChatCount, isDriver, hasPermission, staffRole]);

  const switchTab = useCallback((id) => {
    startTransition(() => setActiveTab(id));
  }, []);

  const renderTabContent = () => {
    if (activeTab === 'orders') return (
      <AdminOrders
        orders={orders} updateOrderStatus={updateOrderStatus}
        staffRole={staffRole} currentStaff={currentStaff}
        isDriver={isDriver} drivers={drivers}
        assignDriverToOrder={assignDriverToOrder} claimOrder={claimOrder}
        allCustomers={allCustomers} staffList={staffList}
        hasPermission={hasPermission}
      />
    );
    if (activeTab === 'store') return (
      <div className="admin-store-section">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {hasPermission('manage_products') && <button className={`admin-sub-tab-btn ${storeTab === 'products' ? 'active' : ''}`} onClick={() => setStoreTab('products')}>📦 المنتجات</button>}
          <button className={`admin-sub-tab-btn ${storeTab === 'featured' ? 'active' : ''}`} onClick={() => setStoreTab('featured')}>⭐ تشكيلة مميزة</button>
          {hasPermission('manage_offers') && <button className={`admin-sub-tab-btn ${storeTab === 'offers' ? 'active' : ''}`} onClick={() => setStoreTab('offers')}>🏷️ العروض</button>}
        </div>
        {storeTab === 'products' && hasPermission('manage_products') ? (
          <AdminProducts staffRole={staffRole} products={allProducts} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} hasPermission={hasPermission} />
        ) : null}
        {storeTab === 'featured' ? (
          <FeaturedManager allProducts={allProducts || []} />
        ) : null}
        {storeTab === 'offers' && hasPermission('manage_offers') ? (
          <AdminOffers staffRole={staffRole} products={allProducts} updateProduct={updateProduct} hasPermission={hasPermission} />
        ) : null}
      </div>
    );
    if (activeTab === 'chat' && hasPermission('manage_chat')) return <AdminChat chatMessages={chatMessages} sendMessage={sendMessage} allCustomers={allCustomers} />;
    if (activeTab === 'settings') return (
      <div className="admin-store-section">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className={`admin-sub-tab-btn ${settingsTab === 'main' ? 'active' : ''}`} onClick={() => setSettingsTab('main')}>⚙️ الإعدادات</button>
          {hasPermission('manage_staff') && <button className={`admin-sub-tab-btn ${settingsTab === 'permissions' ? 'active' : ''}`} onClick={() => setSettingsTab('permissions')}>🔐 الصلاحيات</button>}
          <button className={`admin-sub-tab-btn ${settingsTab === 'users' ? 'active' : ''}`} onClick={() => setSettingsTab('users')}>👤 المستخدمين</button>
          <button className={`admin-sub-tab-btn ${settingsTab === 'stats' ? 'active' : ''}`} onClick={() => setSettingsTab('stats')}>📊 الإحصائيات</button>
          <button className={`admin-sub-tab-btn ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>🔑 الملف الشخصي</button>
        </div>
        {settingsTab === 'main' && <AdminSettings />}
        {settingsTab === 'permissions' && <PermissionManager />}
        {settingsTab === 'users' && <AdminUsers staffRole={staffRole} customers={allCustomers} loadCustomers={loadCustomers} />}
        {settingsTab === 'stats' && <AdminStats />}
        {settingsTab === 'profile' && (
          <div className="admin-profile-section">
            <h2 className="admin-section-title">الملف الشخصي</h2>
            <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                <strong>البريد الإلكتروني:</strong> {currentStaff?.email || '—'}<br />
                <strong>الاسم:</strong> {currentStaff?.name || '—'}<br />
                <strong>الصلاحية:</strong> {staffRole === 'admin' ? 'مدير' : staffRole === 'manager' ? 'مدير عام' : staffRole === 'employee' ? 'موظف' : 'كابتن'}
              </p>
              <button className="btn" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordChangeWithVerify(true); setShowPasswordPrompt(true); }}>
                🔑 تغيير كلمة المرور
              </button>
            </div>
          </div>
        )}
      </div>
    );
    if (activeTab === 'myactivity') {
      return <DriverOrders />;
    }
    if (activeTab === 'staff') return <StaffManager />;
    if (activeTab === 'cleanup') return <AdminCleanup currentStaff={currentStaff} />;
    if (activeTab === 'instructions') return <AdminInstructions staffRole={staffRole} />;
    if (activeTab === 'diagnostics') return <AdminDiagnostics />;
    return null;
  };

  const PasswordDialog = () => (
    <div className="confirm-overlay" onClick={passwordChangeWithVerify ? () => { setShowPasswordPrompt(false); setPasswordChangeWithVerify(false); } : handleSkipPasswordChange}>
      <div className="admin-confirm-dialog" onClick={e => e.stopPropagation()}>
        <p style={{ marginBottom: '0.75rem', fontWeight: 700, fontSize: '1.1rem' }}>
          {passwordChangeWithVerify ? '🔑 تغيير كلمة المرور' : 'تحديث كلمة المرور (اختياري)'}
        </p>
        {!passwordChangeWithVerify && (
          <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
            يفضل تغيير كلمة المرور لحساب الكابتن لزيادة الأمان. يمكنك التخطي الآن والتغيير لاحقًا.
          </p>
        )}
        {passwordChangeWithVerify && (
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            placeholder="كلمة المرور الحالية" className="admin-input-dark" />
        )}
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="كلمة المرور الجديدة" className="admin-input-dark" />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="تأكيد كلمة المرور" className="admin-input-dark" style={{ marginBottom: '1.25rem' }} />
        <div className="confirm-actions">
          <button className="admin-btn-gold confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading}>
            {passwordLoading ? 'جاري التحديث...' : (passwordChangeWithVerify ? 'تحديث كلمة المرور' : 'تحديث الآن')}
          </button>
          <button className="admin-btn-ghost confirm-btn confirm-no" onClick={passwordChangeWithVerify ? () => { setShowPasswordPrompt(false); setPasswordChangeWithVerify(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); } : handleSkipPasswordChange}>
            {passwordChangeWithVerify ? 'إلغاء' : 'التخطي الآن'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-layout">
      {showPasswordPrompt && <PasswordDialog />}
      <div className="admin-mobile-header">
        <button onClick={handleLogout} className="admin-mobile-logout-btn">خروج</button>
        <h2>{tabs.find(t => t.id === activeTab)?.label || ''}</h2>
        <Link to="/" className="admin-sidebar-link">المتجر</Link>
      </div>
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">{isDriver ? 'لوحة الكابتن' : 'لوحة التحكم'}</h2>
        {currentStaff?.name && <p className="admin-sidebar-user">{currentStaff.name}</p>}
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            <TabIcon name={t.icon} badge={t.badge} />
            <span>{t.label}</span>
          </button>
        ))}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-sidebar-link">العودة للمتجر</Link>
          <button onClick={handleLogout} className="admin-sidebar-logout">تسجيل الخروج</button>
        </div>
      </aside>
      <main className="admin-main">
        <Suspense fallback={<div className="admin-loading">جاري التحميل...</div>}>
          <div key={activeTab} className="admin-tab-content">
            {renderTabContent()}
          </div>
        </Suspense>
      </main>
      <nav className="admin-mobile-nav">
        {tabs.map(t => (
          <button key={t.id} className={`admin-mobile-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            <TabIcon name={t.icon} badge={t.badge} />
            <span className="admin-mobile-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
      <ThemeToggle currentTheme={theme} onThemeChange={setTheme} />
    </div>
  );
}

/* ─── Featured Products Manager ─── */
function FeaturedManager({ allProducts }) {
  const [featured, setFeatured] = useState(() => {
    try { return JSON.parse(localStorage.getItem('thara_featured_ids') || '[]'); } catch { return []; }
  });
  const [searchQ, setSearchQ] = useState('');

  const toggleFeatured = (id) => {
    const next = featured.includes(id) ? featured.filter(i => i !== id) : [...featured, id];
    setFeatured(next);
    localStorage.setItem('thara_featured_ids', JSON.stringify(next));
    supabase.from('settings').upsert({ key: 'featured_ids', value: JSON.stringify(next) }, { onConflict: 'key' }).catch(() => {});
    window.dispatchEvent(new Event('thara:featured-changed'));
    showToast(featured.includes(id) ? 'تمت إزالة المنتج من التشكيلة' : 'تمت إضافة المنتج للتشكيلة');
  };

  const featuredProducts = allProducts.filter(p => featured.includes(p.id));
  const otherProducts = allProducts.filter(p => !featured.includes(p.id) && (!searchQ || p.name.includes(searchQ)));

  return (
    <div className="admin-card" style={{ padding: '1.5rem' }}>
      <h3 className="admin-section-title" style={{ marginBottom: '1rem' }}>⭐ تشكيلة مميزة</h3>
      <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
        أضف المنتجات التي تريد عرضها في قسم "تشكيلة مميزة" بالصفحة الرئيسية:
      </p>

      {/* Current featured products */}
      {featuredProducts.length > 0 && (
        <>
          <h4 style={{ fontSize: '0.85rem', color: '#127443', marginBottom: '0.5rem' }}>
            ✅ المنتجات المختارة ({featuredProducts.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {featuredProducts.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(18,116,67,0.06)', borderRadius: '8px',
                padding: '0.3rem 0.6rem', fontSize: '0.85rem'
              }}>
                <img src={safeProductUrl(p.imageUrl)} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                  onError={e => { e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect fill="#127443" width="28" height="28"/><text fill="#FFF" font-size="12" x="14" y="18" text-anchor="middle">T</text></svg>'); }} />
                <span>{p.name}</span>
                <button onClick={() => toggleFeatured(p.id)} style={{
                  background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
                  fontSize: '1rem', lineHeight: 1, padding: '0 0.2rem'
                }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Search & add products */}
      <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
        placeholder="🔍 ابحث عن منتج لإضافته..."
        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #d1d5db', marginBottom: '0.75rem', fontSize: '0.9rem' }} />

      {otherProducts.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>لا توجد نتائج</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '400px', overflowY: 'auto' }}>
          {otherProducts.slice(0, 100).map(p => (
            <div key={p.id} onClick={() => toggleFeatured(p.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem',
              borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(18,116,67,0.04)'}
               onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <img src={safeProductUrl(p.imageUrl)} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                onError={e => { e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect fill="#127443" width="32" height="32"/><text fill="#FFF" font-size="14" x="16" y="21" text-anchor="middle">T</text></svg>'); }} />
              <span style={{ fontSize: '0.9rem', flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.category}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.price?.toFixed(2)} ر.س</span>
              <button style={{
                background: '#127443', color: 'white', border: 'none', borderRadius: '6px',
                padding: '0.25rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer'
              }}>+ إضافة</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
