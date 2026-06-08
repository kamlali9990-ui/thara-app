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

const PASSWORD_INPUT_STYLE = {
  width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255,255,255,0.15)',
  borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit',
  background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none',
  marginBottom: '0.5rem', boxSizing: 'border-box', textAlign: 'right'
};

const PASSWORD_YES_BTN = {
  background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#451a03', fontWeight: 800
};
const PASSWORD_NO_BTN = { background: 'rgba(255,255,255,0.1)', color: '#fff' };

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

  const SUB_TAB_BTN = (active, label) => ({
    background: active ? 'rgba(251,191,36,0.2)' : 'transparent',
    color: active ? '#fbbf24' : 'rgba(255,255,255,0.5)',
    border: active ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
    padding: '0.5rem 1rem', borderRadius: '12px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: active ? 700 : 500,
    transition: 'all 0.15s'
  });

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
          <button style={SUB_TAB_BTN(storeTab === 'products', 'المنتجات')} onClick={() => setStoreTab('products')}>📦 المنتجات</button>
          <button style={SUB_TAB_BTN(storeTab === 'offers', 'العروض')} onClick={() => setStoreTab('offers')}>🏷️ العروض</button>
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
          <button style={SUB_TAB_BTN(settingsTab === 'main', 'الإعدادات')} onClick={() => setSettingsTab('main')}>⚙️ الإعدادات</button>
          <button style={SUB_TAB_BTN(settingsTab === 'users', 'المستخدمين')} onClick={() => setSettingsTab('users')}>👤 المستخدمين</button>
          <button style={SUB_TAB_BTN(settingsTab === 'stats', 'الإحصائيات')} onClick={() => setSettingsTab('stats')}>📊 الإحصائيات</button>
          <button style={SUB_TAB_BTN(settingsTab === 'profile', 'الملف الشخصي')} onClick={() => setSettingsTab('profile')}>🔑 الملف الشخصي</button>
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
                <strong>الصلاحية:</strong> {staffRole === 'admin' ? 'مدير' : staffRole === 'manager' ? 'مدير عام' : staffRole === 'employee' ? 'موظف' : 'سائق'}
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
              <div key={c.label} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem',
                border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.35rem' }}>{c.label}</div>
                <div style={{ color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700 }}>{c.value}</div>
              </div>
            ))}
          </div>
          <div className="admin-orders-list">
            {myOrders.length === 0 ? (
              <div className="empty-orders" style={{ color: '#64748b' }}>لا توجد طلبات مسندة إليك بعد.</div>
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
      <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ background: '#0a2e1a', border: '1px solid rgba(255,255,255,0.15)' }}>
        <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>
          {passwordChangeWithVerify ? '🔑 تغيير كلمة المرور' : 'تحديث كلمة المرور (اختياري)'}
        </p>
        {!passwordChangeWithVerify && (
          <p style={{ marginBottom: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
            يفضل تغيير كلمة المرور لحساب السائق لزيادة الأمان. يمكنك التخطي الآن والتغيير لاحقًا.
          </p>
        )}
        {passwordChangeWithVerify && (
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            placeholder="كلمة المرور الحالية" style={PASSWORD_INPUT_STYLE} />
        )}
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="كلمة المرور الجديدة" style={PASSWORD_INPUT_STYLE} />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="تأكيد كلمة المرور" style={{ ...PASSWORD_INPUT_STYLE, marginBottom: '1.25rem' }} />
        <div className="confirm-actions">
          <button className="confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading} style={PASSWORD_YES_BTN}>
            {passwordLoading ? 'جاري التحديث...' : (passwordChangeWithVerify ? 'تحديث كلمة المرور' : 'تحديث الآن')}
          </button>
          <button className="confirm-btn confirm-no" onClick={passwordChangeWithVerify ? () => { setShowPasswordPrompt(false); setPasswordChangeWithVerify(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); } : handleSkipPasswordChange} style={PASSWORD_NO_BTN}>
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
        <button onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}>خروج</button>
        <h2>{tabs.find(t => t.id === activeTab)?.label || ''}</h2>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>المتجر</Link>
      </div>
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">{isDriver ? 'لوحة السائق' : 'لوحة التحكم'}</h2>
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>
            {t.icon} {t.label}{t.badge != null ? ` (${t.badge})` : ''}
          </button>
        ))}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-sidebar-link">العودة للمتجر</Link>
          <ThemeToggle currentTheme={theme} onThemeChange={setTheme} inline />
          <br/>
          <button onClick={handleLogout} className="admin-tab" style={{ color: 'rgba(255,255,255,0.7)' }}>تسجيل الخروج</button>
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
