import React, { useContext, useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback, startTransition } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { supabase } from './supabase/client';
import { showToast } from './components/Toast.jsx';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './utils/theme';


const AdminOrders = lazy(() => import('./components/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./components/admin/AdminProducts'));
const AdminOffers = lazy(() => import('./components/admin/AdminOffers'));
const AdminChat = lazy(() => import('./components/admin/AdminChat'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const StaffManager = lazy(() => import('./components/StaffManager.jsx'));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings'));
const AdminStats = lazy(() => import('./components/admin/AdminStats'));


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

export default function Admin() {
  const {
    allProducts, orders, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    chatMessages, sendMessage, logout, staffRole, currentStaff,
    allCustomers, loadCustomers, loadOrders, staffList,
    drivers, assignDriverToOrder, claimOrder, loadDrivers
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
    if (isAdminOrManager || isDriver) { try { loadDrivers(); } catch {} }
  }, [loadOrders, staffRole, loadDrivers]);

  useEffect(() => {
    if (!isDriver) { try { Notification.requestPermission().catch(() => {}); } catch {} }
    const handler = (e) => { playNewOrderBeep(); notifyNewOrder(e.detail); };
    window.addEventListener('thara:new-order', handler);
    return () => window.removeEventListener('thara:new-order', handler);
  }, [isDriver]);

  const tabs = useMemo(() => {
    const items = [{ id: 'orders', label: 'الطلبات', icon: '📋', badge: orders.length }];
    items.push({ id: 'chat', label: 'العملاء', icon: '💬' });
    if (isDriver) items.push({ id: 'myactivity', label: 'نشاطي', icon: '🏍️' });
    if (isAdminOrManager) {
      items.push({ id: 'store', label: 'المتجر', icon: '📦' });
      items.push({ id: 'settings', label: 'الإعدادات', icon: '⚙️' });
    }
    if (staffRole === 'admin') items.push({ id: 'staff', label: 'الموظفين', icon: '👥' });
    return items;
  }, [orders.length, isDriver, isAdminOrManager, staffRole]);

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
      />
    );
    if (activeTab === 'store') return (
      <div className="admin-store-section">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className={`admin-sub-tab-btn ${storeTab === 'products' ? 'active' : ''}`} onClick={() => setStoreTab('products')}>📦 المنتجات</button>
          <button className={`admin-sub-tab-btn ${storeTab === 'offers' ? 'active' : ''}`} onClick={() => setStoreTab('offers')}>🏷️ العروض</button>
        </div>
        {storeTab === 'products' ? (
          <AdminProducts staffRole={staffRole} products={allProducts} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />
        ) : (
          <AdminOffers staffRole={staffRole} products={allProducts} updateProduct={updateProduct} />
        )}
      </div>
    );
    if (activeTab === 'chat') return <AdminChat chatMessages={chatMessages} sendMessage={sendMessage} allCustomers={allCustomers} />;
    if (activeTab === 'settings') return (
      <div className="admin-store-section">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className={`admin-sub-tab-btn ${settingsTab === 'main' ? 'active' : ''}`} onClick={() => setSettingsTab('main')}>⚙️ الإعدادات</button>
          <button className={`admin-sub-tab-btn ${settingsTab === 'users' ? 'active' : ''}`} onClick={() => setSettingsTab('users')}>👤 المستخدمين</button>
          <button className={`admin-sub-tab-btn ${settingsTab === 'stats' ? 'active' : ''}`} onClick={() => setSettingsTab('stats')}>📊 الإحصائيات</button>
          <button className={`admin-sub-tab-btn ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>🔑 الملف الشخصي</button>
        </div>
        {settingsTab === 'main' && <AdminSettings />}
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
      const myOrders = orders.filter(o => o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id));
      const completed = myOrders.filter(o => o.status === 'مكتمل');
      const active = myOrders.filter(o => o.status !== 'مكتمل' && o.status !== 'ملغي');
      const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0);
      return (
        <div style={{ padding: '1rem' }}>
          <h2 className="admin-section-title">🏍️ نشاطي</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'إجمالي الطلبات', value: myOrders.length },
              { label: 'قيد التوصيل', value: active.length },
              { label: 'تم التوصيل', value: completed.length },
              { label: 'إيرادات', value: revenue.toFixed(0) + ' ر.س' },
            ].map(c => (
              <div key={c.label} className="admin-stat-card-bg">
                <div className="admin-stat-label">{c.label}</div>
                <div className="admin-stat-value">{c.value}</div>
              </div>
            ))}
          </div>
          <div className="admin-orders-list">
            {myOrders.length === 0 ? (
              <div className="admin-empty-state">لا توجد طلبات مسندة إليك بعد.</div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="admin-card order-card" style={{ marginBottom: '0.75rem' }}>
                  <div className="admin-card-header">
                    <div>
                      <strong>طلب رقم:</strong> #{order.id.slice(-6)} <br/>
                      <small>{order.date ? new Date(order.date).toLocaleString('ar-SA') : ''}</small>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <strong>الإجمالي:</strong> {order.total?.toFixed(2)} ر.س<br/>
                      <span className={`order-badge ${order.status === 'مكتمل' ? 'badge-done' : order.status === 'في الطريق' ? 'badge-route' : order.status === 'جاهز للتوصيل' ? 'badge-ready' : 'badge-new'}`}
                        style={{ fontSize: '0.75rem', display: 'inline-block', marginTop: '0.25rem' }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
    if (activeTab === 'staff') return <StaffManager />;
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
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            {t.icon} {t.label}{t.badge != null ? ` (${t.badge})` : ''}
          </button>
        ))}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-sidebar-link">العودة للمتجر</Link>
          <ThemeToggle currentTheme={theme} onThemeChange={setTheme} inline />
          <br/>
          <button onClick={handleLogout} className="admin-tab">تسجيل الخروج</button>
        </div>
      </aside>
      <main className="admin-main">
        <Suspense fallback={<div className="admin-loading">جاري التحميل...</div>}>
          {renderTabContent()}
        </Suspense>
      </main>
      <nav className="admin-mobile-nav">
        {tabs.map(t => (
          <button key={t.id} className={`admin-mobile-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}{t.badge != null ? ` (${t.badge})` : ''}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
