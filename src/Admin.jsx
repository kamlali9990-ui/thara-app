import React, { useContext, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { supabase } from './supabase/client';
import { showToast } from './components/Toast.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';

const AdminOrders = lazy(() => import('./components/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./components/admin/AdminProducts'));
const AdminOffers = lazy(() => import('./components/admin/AdminOffers'));
const AdminChat = lazy(() => import('./components/admin/AdminChat'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const StaffManager = lazy(() => import('./components/StaffManager.jsx'));

const ADMIN_LOGO = (import.meta.env.BASE_URL || '/') + 'LOGO.jpg';

function playNewOrderBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 600);
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
}

export default function Admin() {
  const { 
    allProducts, orders, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    chatMessages, sendMessage, logout, staffRole, currentStaff,
    allCustomers, loadCustomers, loadOrders,
    drivers, assignDriverToOrder, claimOrder, loadDrivers
  } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const initDriverPrompt = async () => {
      if (staffRole !== 'driver') return;
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email) return;
      const key = `thara_driver_password_prompt_dismissed_${email}`;
      if (localStorage.getItem(key) === '1') return;
      setShowPasswordPrompt(true);
    };
    initDriverPrompt();
  }, [staffRole]);

  const [passwordChangeWithVerify, setPasswordChangeWithVerify] = useState(false);

  const handleSkipPasswordChange = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
    setShowPasswordPrompt(false);
    setPasswordChangeWithVerify(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      showToast('يجب أن تحتوي كلمة المرور على حروف كبيرة وصغيرة وأرقام', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('كلمتا المرور غير متطابقتين', 'warning');
      return;
    }
    setPasswordLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (signInError) {
          showToast('كلمة المرور الحالية غير صحيحة', 'error');
          setPasswordLoading(false);
          return;
        }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
      setShowPasswordPrompt(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      showToast('تم تحديث كلمة المرور بنجاح', 'success');
    } catch (err) {
      showToast('فشل تحديث كلمة المرور: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabLabel = { orders: 'الطلبات', products: 'المنتجات', offers: 'العروض', chat: 'العملاء', staff: 'الموظفين', profile: 'الملف الشخصي' };
  const tabIcon = { orders: '📋', products: '📦', offers: '🏷️', chat: '💬', staff: '👥', profile: '⚙️' };
  const canManageCatalog = staffRole === 'admin' || staffRole === 'manager';
  const isAdminOrManager = staffRole === 'admin' || staffRole === 'manager';
  const isDriver = staffRole === 'driver';

  useEffect(() => {
    if (!loadOrders) return;
    loadOrders();
    if (isAdminOrManager || staffRole === 'driver') {
      try { loadDrivers(); } catch { /* ignore */ }
    }
  }, [loadOrders, staffRole, loadDrivers]);

  // Sound + browser notification on new order (from Realtime subscription)
  useEffect(() => {
    if (!isDriver) {
      try { Notification.requestPermission().catch(() => {}); } catch { /* ignore */ }
    }
    const handler = (e) => {
      playNewOrderBeep();
      notifyNewOrder(e.detail);
    };
    window.addEventListener('thara:new-order', handler);
    return () => window.removeEventListener('thara:new-order', handler);
  }, [isDriver]);
  const tabs = [
    { id: 'orders', label: 'الطلبات', icon: '📋', badge: orders.length },
  ];
  if (!isDriver) tabs.push({ id: 'chat', label: 'العملاء', icon: '💬' });
  if (!isDriver) tabs.push({ id: 'users', label: 'المستخدمين', icon: '👤' });
  if (canManageCatalog) {
    tabs.splice(1, 0,
      { id: 'products', label: 'المنتجات', icon: '📦' },
      { id: 'offers', label: 'العروض', icon: '🏷️' }
    );
  }
  if (staffRole === 'admin') tabs.push({ id: 'staff', label: 'الموظفين', icon: '👥' });
  tabs.push({ id: 'profile', label: 'الملف الشخصي', icon: '⚙️' });

  return (
    <div className="admin-layout">
      {showPasswordPrompt && (
        <div className="confirm-overlay" onClick={passwordChangeWithVerify ? () => { setShowPasswordPrompt(false); setPasswordChangeWithVerify(false); } : handleSkipPasswordChange}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ background: '#0a2e1a', border: '1px solid rgba(255,255,255,0.15)' }}>
            {passwordChangeWithVerify ? (
              <>
                <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: '#ffffff', fontSize: '1.1rem' }}>🔑 تغيير كلمة المرور</p>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit', background: 'rgba(0, 0, 0, 0.3)', color: '#ffffff', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit', background: 'rgba(0, 0, 0, 0.3)', color: '#ffffff', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit', background: 'rgba(0, 0, 0, 0.3)', color: '#ffffff', outline: 'none', marginBottom: '1.25rem', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <div className="confirm-actions">
                  <button className="confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading} style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#451a03', fontWeight: 800 }}>
                    {passwordLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                  </button>
                  <button className="confirm-btn confirm-no" onClick={() => { setShowPasswordPrompt(false); setPasswordChangeWithVerify(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                    إلغاء
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: '#ffffff', fontSize: '1.1rem' }}>تحديث كلمة المرور (اختياري)</p>
                <p style={{ marginBottom: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  يفضل تغيير كلمة المرور لحساب السائق لزيادة الأمان. يمكنك التخطي الآن والتغيير لاحقًا.
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit', background: 'rgba(0, 0, 0, 0.3)', color: '#ffffff', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'inherit', background: 'rgba(0, 0, 0, 0.3)', color: '#ffffff', outline: 'none', marginBottom: '1.25rem', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <div className="confirm-actions">
                  <button className="confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading} style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#451a03', fontWeight: 800 }}>
                    {passwordLoading ? 'جاري التحديث...' : 'تحديث الآن'}
                  </button>
                  <button className="confirm-btn confirm-no" onClick={handleSkipPasswordChange} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                    التخطي الآن
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Mobile header */}
      <div className="admin-mobile-header">
        <button onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}>خروج</button>
        <h2>{tabLabel[activeTab]}</h2>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>المتجر</Link>
      </div>
      {/* Sidebar (desktop) */}
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">{isDriver ? 'لوحة السائق' : 'لوحة التاجر'}</h2>
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}{t.badge != null ? ` (${t.badge})` : ''}
          </button>
        ))}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-sidebar-link">العودة للمتجر</Link>
          <br/><br/>
          <button onClick={handleLogout} className="admin-tab" style={{ color: 'rgba(255,255,255,0.7)' }}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* Main Content */}
      <InstallPrompt variant="admin" />
      <main className="admin-main">
        <Suspense fallback={<div className="admin-loading">جاري التحميل...</div>}>
          {activeTab === 'orders' && (
            <AdminOrders
              orders={orders}
              updateOrderStatus={updateOrderStatus}
              staffRole={staffRole}
              currentStaff={currentStaff}
              isDriver={isDriver}
              drivers={drivers}
              assignDriverToOrder={assignDriverToOrder}
              claimOrder={claimOrder}
            />
          )}
          {activeTab === 'products' && <AdminProducts staffRole={staffRole} products={allProducts} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />}
          {activeTab === 'offers' && <AdminOffers staffRole={staffRole} products={allProducts} updateProduct={updateProduct} />}
          {activeTab === 'chat' && <AdminChat chatMessages={chatMessages} sendMessage={sendMessage} allCustomers={allCustomers} />}
          {activeTab === 'staff' && <StaffManager />}
          {activeTab === 'users' && <AdminUsers staffRole={staffRole} customers={allCustomers} loadCustomers={loadCustomers} />}
          {activeTab === 'profile' && (
            <div className="admin-profile-section">
              <h2 className="admin-section-title">⚙️ الملف الشخصي</h2>
              <div className="admin-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                  <strong>البريد الإلكتروني:</strong> {currentStaff?.email || '—'}<br />
                  <strong>الاسم:</strong> {currentStaff?.name || '—'}<br />
                  <strong>الصلاحية:</strong> {staffRole === 'admin' ? 'مدير' : staffRole === 'manager' ? 'مدير عام' : staffRole === 'employee' ? 'موظف' : 'سائق'}
                </p>
                <button className="btn" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordChangeWithVerify(true); setShowPasswordPrompt(true); }} style={{ marginTop: '0.5rem' }}>
                  🔑 تغيير كلمة المرور
                </button>
              </div>
            </div>
          )}
        </Suspense>
      </main>

      {/* Mobile bottom nav */}
      <nav className="admin-mobile-nav">
        {tabs.map(t => (
          <button key={t.id} className={`admin-mobile-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}{t.badge != null ? ` (${t.badge})` : ''}</span>
          </button>
        ))}
  </nav>
    </div>
  );

}