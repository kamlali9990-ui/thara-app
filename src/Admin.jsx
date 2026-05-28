import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { supabase } from './supabase/client';
import StaffManager from './components/StaffManager.jsx';
import OrderLocationMap from './components/OrderLocationMap.jsx';
import { categories } from './data/mockData';
import { parseOrderLocation, getMapLinks } from './utils/location.js';

const ADMIN_LOGO = (import.meta.env.BASE_URL || '/') + 'LOGO.jpg';

// Short beep using Web Audio API — no asset file needed.
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

  const handleSkipPasswordChange = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
    setShowPasswordPrompt(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('كلمتا المرور غير متطابقتين');
      return;
    }
    setPasswordLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (email) localStorage.setItem(`thara_driver_password_prompt_dismissed_${email}`, '1');
      setShowPasswordPrompt(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('تم تحديث كلمة المرور بنجاح');
    } catch (err) {
      alert('فشل تحديث كلمة المرور: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabLabel = { orders: 'الطلبات', products: 'المنتجات', offers: 'العروض', chat: 'العملاء', staff: 'الموظفين' };
  const tabIcon = { orders: '📋', products: '📦', offers: '🏷️', chat: '💬', staff: '👥' };
  const canManageCatalog = staffRole === 'admin' || staffRole === 'manager';
  const isDriver = staffRole === 'driver';

  useEffect(() => {
    if (!loadOrders) return;
    loadOrders();
    if (staffRole === 'admin' || staffRole === 'manager' || staffRole === 'driver') {
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

  return (
    <div className="admin-layout">
      {showPasswordPrompt && (
        <div className="confirm-overlay" onClick={handleSkipPasswordChange}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ background: '#0a2e1a', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: '#ffffff', fontSize: '1.1rem' }}>تحديث كلمة المرور (اختياري)</p>
            <p style={{ marginBottom: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
              يفضل تغيير كلمة المرور لحساب السائق لزيادة الأمان. يمكنك التخطي الآن والتغيير لاحقًا.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                outline: 'none',
                marginBottom: '0.5rem',
                boxSizing: 'border-box',
                textAlign: 'right'
              }}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                outline: 'none',
                marginBottom: '1.25rem',
                boxSizing: 'border-box',
                textAlign: 'right'
              }}
            />
            <div className="confirm-actions">
              <button className="confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading} style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#451a03', fontWeight: 800 }}>
                {passwordLoading ? 'جاري التحديث...' : 'تحديث الآن'}
              </button>
              <button className="confirm-btn confirm-no" onClick={handleSkipPasswordChange} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                التخطي الآن
              </button>
            </div>
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
      <main className="admin-main">
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
        {activeTab === 'products' && <AdminProducts products={allProducts} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />}
        {activeTab === 'offers' && <AdminOffers products={allProducts} updateProduct={updateProduct} />}
        {activeTab === 'chat' && <AdminChat chatMessages={chatMessages} sendMessage={sendMessage} />}
        {activeTab === 'staff' && <StaffManager />}
        {activeTab === 'users' && <AdminUsers customers={allCustomers} loadCustomers={loadCustomers} />}
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

const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'مكتمل'];

function AdminOrders({ orders, updateOrderStatus, staffRole, currentStaff, isDriver, drivers, assignDriverToOrder, claimOrder }) {
  const { chatMessages, sendMessage } = useContext(StoreContext);
  const [etaInputs, setEtaInputs] = useState({});
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeDriverTab, setActiveDriverTab] = useState('available');
  const [etaModalOrder, setEtaModalOrder] = useState(null);
  const [etaModalValue, setEtaModalValue] = useState('30');

  if(orders.length === 0) return <h3 className="empty-orders">لا توجد طلبات حالياً.</h3>;
  const stats = {
    newOrders: orders.filter(o => o.status === 'جديد').length,
    preparing: orders.filter(o => o.status === 'قيد التحضير').length,
    ready: orders.filter(o => o.status === 'جاهز للتوصيل').length,
    onRoute: orders.filter(o => o.status === 'في الطريق').length,
    completed: orders.filter(o => o.status === 'مكتمل').length,
    revenue: orders.filter(o => o.status !== 'ملغي').reduce((sum, o) => sum + Number(o.total || 0), 0)
  };

  const handleStatusChange = (order, newStatus) => {
    const ci = STATUS_ORDER.indexOf(order.status);
    const ni = STATUS_ORDER.indexOf(newStatus);
    if (newStatus !== 'ملغي' && ni < ci) {
      setConfirmMsg({
        text: `هل أنت متأكد من إرجاع الطلب #${order.id.slice(-6)} من "${order.status}" إلى "${newStatus}"؟`,
        onConfirm: () => { setConfirmMsg(null); doUpdate(order, newStatus); }
      });
      return;
    }
    if (newStatus !== 'ملغي' && ni > ci) {
      setConfirmMsg({
        text: `تغيير حالة الطلب #${order.id.slice(-6)} إلى "${newStatus}"؟`,
        onConfirm: () => { setConfirmMsg(null); doUpdate(order, newStatus); }
      });
      return;
    }
    if (newStatus === 'ملغي') {
      setConfirmMsg({
        text: `هل أنت متأكد من إلغاء الطلب #${order.id.slice(-6)}؟`,
        onConfirm: () => { setConfirmMsg(null); doUpdate(order, 'ملغي'); }
      });
      return;
    }
  };

  const doUpdate = (order, newStatus) => {
    if (newStatus === 'في الطريق') {
      setEtaModalOrder(order);
      setEtaModalValue('30');
      return;
    }
    let eta = etaInputs[order.id];
    try {
      updateOrderStatus(order.id, newStatus, eta ? Number(eta) : undefined);
    } catch (e) {
      alert(e.message);
    }
  };

  const confirmEtaModal = () => {
    const order = etaModalOrder;
    if (!order) return;
    const eta = etaModalValue;
    if (!eta || isNaN(eta) || Number(eta) <= 0) {
      alert('الرجاء إدخال وقت توصيل صحيح');
      return;
    }
    setEtaInputs(prev => ({ ...prev, [order.id]: eta }));
    updateOrderStatus(order.id, 'في الطريق', Number(eta));
    setEtaModalOrder(null);
  };

  const orderChatMessages = (orderId) => chatMessages.filter(m => !m.orderId || m.orderId === orderId);
  const senderRole = staffRole === 'driver' ? 'driver' : 'admin';
  const activeOrders = orders.filter(o => o.status !== 'مكتمل');
  const completedOrders = orders.filter(o => o.status === 'مكتمل');

  const getStatusClass = (status) => {
    if (status === 'جديد') return 'status-new';
    if (status === 'قيد التحضير') return 'status-preparing';
    if (status === 'جاهز للتوصيل') return 'status-ready';
    if (status === 'في الطريق') return 'status-route';
    if (status === 'ملغي') return 'status-cancelled';
    if (status === 'مكتمل') return 'status-completed';
    return '';
  };

  const renderLocationBlock = (order, { showMap = true } = {}) => {
    const coords = parseOrderLocation(order.location);
    if (!coords) {
      return order.location ? <p className="order-location-missing">الموقع: {order.location}</p> : null;
    }
    const links = getMapLinks(coords);
    return (
      <div className="order-location-block">
        {showMap && <OrderLocationMap lat={coords.lat} lng={coords.lng} />}
        <div className="admin-location-actions">
          <a href={links.googleDir} target="_blank" rel="noopener noreferrer" className="map-link map-link-google">
            📍 توجيه Google Maps
          </a>
          <a href={links.osmView} target="_blank" rel="noopener noreferrer" className="map-link map-link-osm">
            🗺️ عرض OpenStreetMap
          </a>
        </div>
      </div>
    );
  };

  const renderDriverActions = (order) => {
    if (!order.assignedDriverId) {
      return (
        <button
          type="button"
          className="btn driver-action-btn driver-action-claim"
          onClick={async () => {
            if (window.confirm('هل أنت متأكد من رغبتك في قبول واستلام هذا الطلب لتوصيله؟')) {
              try {
                await claimOrder(order.id);
                alert('تم قبول الطلب وإضافته لطلباتك بنجاح!');
              } catch (err) {
                alert('فشل قبول الطلب: ' + (err.message || 'خطأ غير معروف'));
              }
            }
          }}
          style={{ backgroundColor: '#127443', color: '#fff', fontWeight: 'bold' }}
        >
          قبول واستلام الطلب
        </button>
      );
    }

    if (order.status === 'جديد') {
      return (
        <button type="button" className="btn driver-action-btn" onClick={() => doUpdate(order, 'قيد التحضير')}>
          تجهيز الطلب
        </button>
      );
    }
    if (order.status === 'قيد التحضير') {
      return (
        <button type="button" className="btn driver-action-btn driver-action-route" onClick={() => doUpdate(order, 'في الطريق')}>
          بدء التوصيل
        </button>
      );
    }
    if (order.status === 'في الطريق') {
      return (
        <button type="button" className="btn driver-action-btn driver-action-done" onClick={() => doUpdate(order, 'مكتمل')}>
          تم التسليم
        </button>
      );
    }
    return <span className="driver-status-done">مكتمل</span>;
  };

  const renderOrderCard = (order, { compact = false } = {}) => (
    <div
      key={order.id}
      className={`admin-card order-card ${order.status === 'مكتمل' ? 'order-card-completed' : 'order-card-active'} ${getStatusClass(order.status)}`}
    >
      <div className="admin-card-header">
        <div>
          <strong>طلب رقم:</strong> #{order.id.slice(-6)} <br/>
          <small>{new Date(order.date).toLocaleString('ar-SA')}</small>
          {order.estimatedDelivery && (
            <div className="admin-eta-badge">
              🕐 التوصيل خلال {order.estimatedDelivery} دقيقة
            </div>
          )}
        </div>
        <div className="admin-order-right" style={{ textAlign: 'left' }}>
          <strong>الإجمالي:</strong> <span className="order-total-text">{order.total.toFixed(2)} ر.س</span><br/>
          {!compact && (
            isDriver ? renderDriverActions(order) : (
              order.status === 'جديد' ? (
                <button
                  onClick={() => doUpdate(order, 'قيد التحضير')}
                  className="btn btn-accept"
                >
                  استلام الطلب
                </button>
              ) : (
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order, e.target.value)}
                  className="order-status-select"
                >
                  <option value="جديد">جديد</option>
                  <option value="قيد التحضير">قيد التحضير</option>
                  <option value="جاهز للتوصيل">جاهز للتوصيل</option>
                  <option value="في الطريق">في الطريق</option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="ملغي">ملغي</option>
                </select>
              )
            )
          )}
        </div>
      </div>
      {!compact && (
        <div>
          <strong>المنتجات المطلوبة:</strong>
          <ul className="order-items-list">
            {order.items.map(item => (
              <li key={item.id}>{item.name} (الكمية: {item.qty})</li>
            ))}
          </ul>
        </div>
      )}
      <div className="admin-card-info">
        <strong>الدفع:</strong> {order.paymentMethod}
        {order.phone && <><br/><strong>الجوال:</strong> <span dir="ltr">{order.phone}</span> <a href={`https://wa.me/${order.phone.replace(/^0/, '966')}`} target="_blank" rel="noopener noreferrer" className="whatsapp-link" title="واتساب" style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)' }}>💬</a></>}
        {order.notes && !compact && <><br/><strong>ملاحظات:</strong> {order.notes}</>}
        {!compact && renderLocationBlock(order, { showMap: !compact })}
        {compact && parseOrderLocation(order.location) && (
          <div className="admin-location-actions" style={{ marginTop: '0.5rem' }}>
            <a href={getMapLinks(parseOrderLocation(order.location)).googleDir} target="_blank" rel="noopener noreferrer" className="map-link">📍 خرائط</a>
          </div>
        )}

        {/* Driver assignment dropdown for admin/manager */}
        {!compact && !isDriver && (
          <div className="admin-assign-driver-block" style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>🚚 تعيين السائق:</strong>
            <select
              value={order.assignedDriverId || ''}
              onChange={async (e) => {
                const val = e.target.value;
                try {
                  await assignDriverToOrder(order.id, val ? Number(val) : null);
                  alert('تم تحديث تعيين السائق بنجاح');
                } catch (err) {
                  alert('فشل تعيين السائق: ' + (err.message || 'خطأ غير معروف'));
                }
              }}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
                borderRadius: '4px',
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'inherit'
              }}
            >
              <option value="">-- غير معين --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name || d.email}</option>
              ))}
            </select>
            {order.assignedDriverId && (
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                ✓ معين لـ {drivers.find(d => String(d.id) === String(order.assignedDriverId))?.name || 'سائق'}
              </span>
            )}
          </div>
        )}

        {/* Display assigned driver name for drivers */}
        {!compact && isDriver && order.assignedDriverId && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#fbbf24' }}>
            🏍️ السائق المكلف بالطلب: <strong>{String(order.assignedDriverId) === String(currentStaff?.id) ? 'أنت' : (drivers.find(d => String(d.id) === String(order.assignedDriverId))?.name || 'سائق آخر')}</strong>
          </div>
        )}

        <div style={{ marginTop: '0.4rem' }}>
          <button type="button" className="chat-order-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة الطلب</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {confirmMsg && (
        <div className="confirm-overlay" onClick={() => setConfirmMsg(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>{confirmMsg.text}</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-yes" onClick={confirmMsg.onConfirm}>تأكيد</button>
              <button className="confirm-btn confirm-no" onClick={() => setConfirmMsg(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {chatOrder && (
        <div className="confirm-overlay" onClick={() => { setChatOrder(null); setChatText(''); }}>
          <div className="order-chat-dialog" onClick={e => e.stopPropagation()}>
            <div className="order-chat-header">
              <strong>محادثة الطلب #{chatOrder.slice(-6)}</strong>
              <button className="chat-close-btn" onClick={() => { setChatOrder(null); setChatText(''); }}>✕</button>
            </div>
            <div className="order-chat-body">
              {orderChatMessages(chatOrder).length === 0 && <p className="empty-chat">لا توجد رسائل بعد.</p>}
              {orderChatMessages(chatOrder).map(m => {
                const isMe = m.sender === senderRole;
                const getSenderLabel = (msg) => {
                  if (msg.sender === senderRole) return 'أنت';
                  if (msg.sender === 'customer') return 'العميل';
                  if (msg.sender === 'driver') {
                    const o = orders.find(x => x.id === chatOrder);
                    const dName = o ? drivers.find(d => String(d.id) === String(o.assignedDriverId))?.name : null;
                    return dName ? `السائق (${dName})` : 'السائق';
                  }
                  if (msg.sender === 'admin') {
                    return 'المتجر / الدعم';
                  }
                  return msg.sender;
                };
                return (
                  <div key={m.id} className={`admin-bubble ${isMe ? 'admin' : 'customer'}`}>
                    <div className="admin-bubble-sender">{getSenderLabel(m)}</div>
                    <div>{m.text}</div>
                    <div className="admin-bubble-time">{m.time}</div>
                  </div>
                );
              })}
            </div>
            <div className="order-chat-input">
              <input type="text" value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { if (chatText.trim()) { sendMessage(senderRole, chatText, chatOrder); setChatText(''); } } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage(senderRole, chatText, chatOrder); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      {etaModalOrder && (
        <div className="confirm-overlay" onClick={() => setEtaModalOrder(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ background: '#0a2e1a', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>⏱ وقت التوصيل المقدر</p>
            <p style={{ marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
              أدخل الوقت المتوقع للتوصيل بالدقائق للطلب #{etaModalOrder.id.slice(-6)}
            </p>
            <input
              type="number"
              value={etaModalValue}
              onChange={e => setEtaModalValue(e.target.value)}
              min="1"
              max="180"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontFamily: 'inherit',
                background: 'rgba(0,0,0,0.3)',
                color: '#ffffff',
                outline: 'none',
                marginBottom: '1rem',
                boxSizing: 'border-box',
                textAlign: 'center'
              }}
            />
            <div className="confirm-actions">
              <button className="confirm-btn confirm-yes" onClick={confirmEtaModal} style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#451a03', fontWeight: 800 }}>
                تأكيد وبدء التوصيل
              </button>
              <button className="confirm-btn confirm-no" onClick={() => setEtaModalOrder(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="admin-section-title">{isDriver ? 'طلبات التوصيل' : 'إدارة الطلبات'}</h2>
      {isDriver ? (
        <div className="driver-stats-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', width: '100%' }}>
          <div className="admin-stat-card" style={{ flex: '1', backgroundColor: activeDriverTab === 'available' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.15)', borderColor: activeDriverTab === 'available' ? '#3b82f6' : 'rgba(37, 99, 235, 0.3)', padding: '0.75rem 0.25rem', textAlign: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveDriverTab('available')}>
            <span style={{ fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              متاحة {(stats.newOrders + stats.preparing) > 0 && <span className="bell-ring">🔔</span>}
            </span>
            <strong style={{ fontSize: '1.25rem', color: '#fff' }}>{stats.newOrders + stats.preparing}</strong>
          </div>
          <div className="admin-stat-card" style={{ flex: '1', backgroundColor: activeDriverTab === 'assigned' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.15)', borderColor: activeDriverTab === 'assigned' ? '#c084fc' : 'rgba(139, 92, 246, 0.3)', padding: '0.75rem 0.25rem', textAlign: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveDriverTab('assigned')}>
            <span style={{ fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>مكلف بها</span>
            <strong style={{ fontSize: '1.25rem', color: '#fff' }}>{stats.onRoute}</strong>
          </div>
          <div className="admin-stat-card" style={{ flex: '1', backgroundColor: activeDriverTab === 'completed' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.15)', borderColor: activeDriverTab === 'completed' ? '#34d399' : 'rgba(16, 185, 129, 0.3)', padding: '0.75rem 0.25rem', textAlign: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveDriverTab('completed')}>
            <span style={{ fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>مكتملة</span>
            <strong style={{ fontSize: '1.25rem', color: '#fff' }}>{stats.completed}</strong>
          </div>
        </div>
      ) : (
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><span>طلبات جديدة</span><strong>{stats.newOrders}</strong></div>
          <div className="admin-stat-card"><span>قيد التحضير</span><strong>{stats.preparing}</strong></div>
          <div className="admin-stat-card"><span>مكتملة</span><strong>{stats.completed}</strong></div>
          <div className="admin-stat-card"><span>المبيعات</span><strong>{stats.revenue.toFixed(2)} ر.س</strong></div>
        </div>
      )}

      {isDriver ? (
        <div className="driver-tab-content" style={{ minHeight: '300px' }}>
          {activeDriverTab === 'available' && (
            <>
              <h3 className="driver-sub-title" style={{ marginTop: '0.5rem', marginBottom: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>📦 طلبات متوفرة ومتاحة للتوصيل ({orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).length})</h3>
              <div className="admin-orders-list">
                {orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).length === 0 ? (
                  <div className="empty-orders" style={{ color: '#fff' }}>لا توجد طلبات متوفرة للتوصيل حالياً.</div>
                ) : (
                  orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).map(order => renderOrderCard(order))
                )}
              </div>
            </>
          )}

          {activeDriverTab === 'assigned' && (
            <>
              <h3 className="driver-sub-title" style={{ marginTop: '0.5rem', marginBottom: '1rem', color: '#c084fc', fontWeight: 'bold' }}>🏍️ طلباتي المكلف بها حالياً ({orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).length})</h3>
              <div className="admin-orders-list">
                {orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).length === 0 ? (
                  <div className="empty-orders" style={{ color: '#fff' }}>لا توجد لديك طلبات جارية مكلف بها حالياً.</div>
                ) : (
                  orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).map(order => renderOrderCard(order))
                )}
              </div>
            </>
          )}

          {activeDriverTab === 'completed' && (
            <>
              <h3 className="driver-sub-title" style={{ marginTop: '0.5rem', marginBottom: '1rem', color: '#34d399', fontWeight: 'bold' }}>✅ أرشيف الطلبات المكتملة ({completedOrders.length})</h3>
              <div className="admin-orders-list completed-orders-list">
                {completedOrders.length === 0 ? (
                  <div className="empty-orders" style={{ color: '#fff' }}>لا توجد طلبات مكتملة.</div>
                ) : (
                  completedOrders.map(order => renderOrderCard(order, { compact: true }))
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="admin-orders-list">
          {activeOrders.length === 0 && (
            <div className="empty-orders">لا توجد طلبات نشطة حالياً.</div>
          )}
          {activeOrders.map(order => renderOrderCard(order))}
        </div>
      )}

      {completedOrders.length > 0 && !isDriver && (
        <div className="completed-orders-section">
          <button
            className="completed-toggle-btn"
            onClick={() => setShowCompleted(prev => !prev)}
          >
            {showCompleted ? '▾' : '▸'} الطلبات المكتملة ({completedOrders.length})
          </button>
          {showCompleted && (
            <div className="admin-orders-list completed-orders-list">
              {completedOrders.map(order => renderOrderCard(order, { compact: true }))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminProducts({ products, addProduct, updateProduct, deleteProduct }) {
  const { bulkImportProducts } = useContext(StoreContext);
  const [form, setForm] = useState({
    name: '',
    category: categories.find(c => c !== 'الكل' && c !== 'العروض') || 'المؤن',
    price: '',
    stock_quantity: '',
    unit: 'حبة',
    imageUrl: ''
  });
  const [showImport, setShowImport] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addProduct({
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      imageUrl: form.imageUrl.trim() || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#127443" width="400" height="400"/><text fill="#FFFFFF" font-family="sans-serif" font-size="40" x="200" y="200" text-anchor="middle" dominant-baseline="middle">ثرا</text></svg>'),
      unit: form.unit.trim() || 'حبة',
      isOffer: false
    });
    setForm(prev => ({ ...prev, name: '', price: '', stock_quantity: '', imageUrl: '' }));
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setPreviewRows(rows.map((r, i) => ({ _row: i + 1, ...r })));
      } catch {
        alert('فشل قراءة الملف. تأكد من أن الملف بصيغة Excel أو CSV صحيحة.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePaste = (text) => {
    try {
      const lines = text.trim().split('\n');
      const rows = lines.map((line, i) => {
        const parts = line.split('\t');
        if (parts.length < 2) parts.push(...line.split(','));
        return { _row: i + 1, name: parts[0], category: parts[1], price: parts[2], stock_quantity: parts[3], unit: parts[4], imageUrl: parts[5] };
      });
      setPreviewRows(rows);
    } catch {
      alert('فشل تحليل النص. تأكد من استخدام تبويب أو فاصلة بين الأعمدة.');
    }
  };

  const doImport = async () => {
    if (!previewRows.length) return;
    setImporting(true);
    const mapped = previewRows.map(r => ({
      name: String(r.name || r.الاسم || '').trim(),
      category: String(r.category || r.القسم || r.التصنيف || r.الصنف || 'المؤن').trim(),
      price: parseFloat(r.price || r.السعر || 0) || 0,
      stock_quantity: parseInt(r.stock_quantity || r.المخزون || r.الكمية || 0, 10) || 0,
      unit: String(r.unit || r.الوحدة || 'حبة').trim(),
      imageUrl: String(r.imageUrl || r.image_url || r.الصورة || '').trim(),
      isOffer: !!(r.isOffer || r.is_offer || r.عرض)
    }));
    try {
      const created = await bulkImportProducts(mapped);
      alert(`تم استيراد ${created.length} منتج بنجاح`);
      setPreviewRows([]);
      setShowImport(false);
    } catch (err) {
      alert('فشل الاستيراد: ' + (err.message || 'خطأ غير معروف'));
    }
    setImporting(false);
  };

  return (
    <div>
      <div className="admin-products-header">
        <h2 className="admin-section-title">إدارة المنتجات ({products.length})</h2>
        <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} onClick={() => { setShowImport(!showImport); setPreviewRows([]); }}>استيراد</button>
      </div>

      {showImport && (
        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#f1f5f9', fontSize: '1rem' }}>استيراد منتجات</h3>
          
          {/* File upload */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>رفع ملف Excel أو CSV</label>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ color: '#e2e8f0' }} />
          </div>

          {/* Paste area */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>أو لصق نص (اسم، قسم، سعر، مخزون، وحدة، رابط صورة)</label>
            <textarea
              rows={4}
              style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.5rem', color: '#e2e8f0', fontFamily: 'inherit', fontSize: '0.85rem' }}
              placeholder={"أرز بسمتي, المؤن, 40, 50, كيس, https://..."}
              onBlur={(e) => e.target.value.trim() && handlePaste(e.target.value)}
            />
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>تم تحديد {previewRows.length} منتج:</p>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>الاسم</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>القسم</th>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>السعر</th>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 20).map(r => (
                      <tr key={r._row} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '0.3rem', color: '#e2e8f0' }}>{r.name || r.الاسم || '—'}</td>
                        <td style={{ padding: '0.3rem', color: '#94a3b8' }}>{r.category || r.القسم || '—'}</td>
                        <td style={{ padding: '0.3rem', color: '#fbbf24', textAlign: 'left' }}>{r.price || r.السعر || '—'}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'left' }}>{r.stock_quantity || r.المخزون || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 20 && <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>و {previewRows.length - 20} منتج آخر...</p>}
              </div>
              <button className="btn" onClick={doImport} disabled={importing}>
                {importing ? 'جاري الاستيراد...' : `استيراد ${previewRows.length} منتج`}
              </button>
            </>
          )}
        </div>
      )}
      <form className="admin-product-form" onSubmit={handleAddProduct}>
        <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="اسم المنتج" className="admin-product-form-input" required />
        <select value={form.category} onChange={e => updateForm('category', e.target.value)} className="admin-product-form-input">
          {categories.filter(c => c !== 'الكل' && c !== 'العروض').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={form.price} onChange={e => updateForm('price', e.target.value)} type="number" step="0.01" placeholder="السعر" className="admin-product-form-input" />
        <input value={form.stock_quantity} onChange={e => updateForm('stock_quantity', e.target.value)} type="number" placeholder="المخزون" className="admin-product-form-input" />
        <input value={form.unit} onChange={e => updateForm('unit', e.target.value)} placeholder="الوحدة" className="admin-product-form-input" />
        <input value={form.imageUrl} onChange={e => updateForm('imageUrl', e.target.value)} placeholder="رابط الصورة" className="admin-product-form-input admin-product-form-wide" />
        <button className="btn admin-product-form-submit" type="submit">إضافة المنتج</button>
      </form>
      
      <div className="admin-products-grid">
        {products.map(p => (
          <div key={p.id} className="admin-product-card">
            <img src={p.imageUrl} alt="" className="admin-product-img" onError={(e) => { if (e.target.src !== ADMIN_LOGO) e.target.src = ADMIN_LOGO; }} />
            <input 
              type="text" 
              value={p.name} 
              onChange={e => updateProduct(p.id, {name: e.target.value})} 
              className="admin-product-field"
            />
            <div className="admin-input-row">
              <input type="number" value={p.price} onChange={e => updateProduct(p.id, {price: parseFloat(e.target.value) || 0})} className="admin-input-half" placeholder="السعر" />
              <input type="text" value={p.category} onChange={e => updateProduct(p.id, {category: e.target.value})} className="admin-input-half" />
            </div>
            <div className="admin-input-row">
              <input type="number" value={p.stock_quantity || 0} onChange={e => updateProduct(p.id, {stock_quantity: parseInt(e.target.value) || 0})} className="admin-input-half" placeholder="المخزون" />
              <button className="admin-delete-btn" onClick={() => deleteProduct(p.id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminOffers({ products, updateProduct }) {
  return (
    <div>
      <h2 className="admin-section-title">إدارة العروض الخاصة</h2>
      <p style={{marginBottom: '1rem', color: 'var(--text-light)'}}>فعل خيار العرض وحدد سعر العرض ليظهر المنتج في قسم العروض في التطبيق.</p>
      
      <div className="admin-offers-list">
        {products.map(p => (
          <div key={p.id} className="admin-offer-row">
            <img src={p.imageUrl} className="admin-offer-img" />
            <div className="admin-offer-info">
              <div className="admin-offer-name">{p.name}</div>
              <div className="admin-offer-price">السعر الأصلي: {p.price.toFixed(2)} ر.س</div>
            </div>
            
            <label className="admin-offer-checkbox">
              <input type="checkbox" checked={p.isOffer || false} onChange={e => updateProduct(p.id, {isOffer: e.target.checked, offerPrice: p.price})} />
              ضمن العروض
            </label>

            {p.isOffer && (
              <div className="admin-offer-price-input">
                سعر العرض: 
                <input 
                  type="number" 
                  value={p.offerPrice || 0} 
                  onChange={e => updateProduct(p.id, {offerPrice: parseFloat(e.target.value) || 0})}
                  className="admin-offer-input"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminChat({ chatMessages, sendMessage }) {
  const [text, setText] = useState('');
  const [activeCustomer, setActiveCustomer] = useState(null);
  const chatBodyRef = useRef(null);

  // Group support messages (non-order) by customer_email
  const supportMessages = chatMessages.filter(m => !m.orderId && m.customerEmail);
  const threads = {};
  supportMessages.forEach(m => {
    const key = m.customerEmail;
    if (!threads[key]) threads[key] = [];
    threads[key].push(m);
  });
  const threadList = Object.entries(threads)
    .map(([email, msgs]) => ({
      email,
      lastMsg: msgs[msgs.length - 1],
      unread: msgs.filter(m => m.sender === 'customer').length,
      messages: msgs
    }))
    .sort((a, b) => (b.lastMsg.timestamp || 0) > (a.lastMsg.timestamp || 0) ? 1 : -1);

  // Auto-scroll chat body when messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeCustomer, chatMessages]);

  const activeThread = activeCustomer ? (threads[activeCustomer] || []) : [];

  const handleSend = () => {
    if (!text.trim() || !activeCustomer) return;
    sendMessage('admin', text, null, activeCustomer);
    setText('');
  };

  return (
    <div className="admin-chat-container">
      <h2 className="admin-section-title">خدمة العملاء (محادثات خاصة)</h2>

      <div style={{ display: 'flex', gap: '1rem', height: 'calc(70vh - 4rem)', minHeight: '350px' }}>
        {/* Thread List (Left Panel) */}
        <div style={{
          width: '280px', minWidth: '220px', maxWidth: '320px',
          background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
          border: '0.5px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{
            padding: '0.85rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0'
          }}>
            💬 المحادثات ({threadList.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threadList.length === 0 && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                لا توجد محادثات دعم بعد.
              </div>
            )}
            {threadList.map(t => (
              <div
                key={t.email}
                onClick={() => setActiveCustomer(t.email)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  background: activeCustomer === t.email ? 'rgba(251,191,36,0.1)' : 'transparent',
                  borderRight: activeCustomer === t.email ? '3px solid #fbbf24' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: activeCustomer === t.email ? '#fbbf24' : '#e2e8f0' }}>
                    {t.email.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{t.lastMsg.time}</span>
                </div>
                <div style={{
                  fontSize: '0.78rem', color: '#94a3b8',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px'
                }}>
                  {t.lastMsg.sender === 'admin' ? 'أنت: ' : ''}{t.lastMsg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Chat (Right Panel) */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '0.5px solid rgba(255,255,255,0.1)', overflow: 'hidden'
        }}>
          {!activeCustomer ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '0.75rem'
            }}>
              <span style={{ fontSize: '2.5rem' }}>💬</span>
              <p style={{ fontSize: '0.95rem' }}>اختر محادثة عميل من القائمة</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                    {activeCustomer.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{activeCustomer}</div>
                </div>
                <button onClick={() => setActiveCustomer(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
              </div>

              {/* Messages Body */}
              <div ref={chatBodyRef} style={{
                flex: 1, overflowY: 'auto', padding: '1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem'
              }}>
                {activeThread.length === 0 && <p className="empty-chat">لا توجد رسائل بعد.</p>}
                {activeThread.map(m => (
                  <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}`}>
                    <div className="admin-bubble-sender">{m.sender === 'admin' ? 'أنت (التاجر)' : 'العميل'}</div>
                    <div>{m.text}</div>
                    <div className="admin-bubble-time">{m.time}</div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="admin-chat-input-area" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب ردك للعميل هنا..."
                  className="admin-chat-input"
                />
                <button className="btn" onClick={handleSend}>إرسال</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ customers, loadCustomers }) {
  const [resettingEmail, setResettingEmail] = useState(null);

  const handleResetPassword = async (email) => {
    if (!window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) return;
    setResettingEmail(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/')
      });
      if (error) throw error;
      alert('تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني');
    } catch (err) {
      alert('فشل إرسال الرابط: ' + err.message);
    }
    setResettingEmail(null);
  };

  React.useEffect(() => { loadCustomers(); }, [loadCustomers]);

  if (!customers.length) return <div><h2 className="admin-section-title">المستخدمين</h2><p>لا يوجد مستخدمين مسجلين.</p></div>;

  return (
    <div>
      <h2 className="admin-section-title">المستخدمين ({customers.length})</h2>
      <div className="admin-orders-list">
        {customers.map(c => (
          <div key={c.id} className="admin-card">
            <div className="admin-card-header" style={{ alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1rem' }}>{c.name || 'بدون اسم'}</strong>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>{c.email}</div>
              </div>
              <div style={{ textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>نقاط الولاء</span><br/>
                  <strong style={{ color: '#fbbf24', fontSize: '1.2rem' }}>{c.loyalty_points ?? 0}</strong>
                </div>
                <button
                  onClick={() => handleResetPassword(c.email)}
                  disabled={resettingEmail === c.email}
                  className="btn"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap' }}
                >
                  {resettingEmail === c.email ? 'جاري الإرسال...' : 'إعادة تعيين كلمة المرور'}
                </button>
              </div>
            </div>
            <div className="admin-card-info">
              <strong>الهاتف:</strong> {c.phone || 'غير محدد'} | <strong>تاريخ التسجيل:</strong> {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
