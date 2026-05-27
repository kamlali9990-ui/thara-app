import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { supabase } from './supabase/client';
import * as XLSX from 'xlsx';
import StaffManager from './components/StaffManager.jsx';
import { categories } from './data/mockData';

const ADMIN_LOGO = (import.meta.env.BASE_URL || '/') + 'LOGO.jpg';

export default function Admin() {
  const { 
    allProducts, orders, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    chatMessages, sendMessage, logout, staffRole,
    allCustomers, loadCustomers
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
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 700 }}>تحديث كلمة المرور (اختياري)</p>
            <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
              يفضل تغيير كلمة المرور لحساب السائق لزيادة الأمان. يمكنك التخطي الآن والتغيير لاحقًا.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              className="auth-input"
              style={{ marginBottom: '0.5rem' }}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="auth-input"
              style={{ marginBottom: '1rem' }}
            />
            <div className="confirm-actions">
              <button className="confirm-btn confirm-yes" onClick={handlePasswordChange} disabled={passwordLoading}>
                {passwordLoading ? 'جاري التحديث...' : 'تحديث الآن'}
              </button>
              <button className="confirm-btn confirm-no" onClick={handleSkipPasswordChange}>
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
        <h2 className="admin-sidebar-title">لوحة التاجر</h2>
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
        {activeTab === 'orders' && <AdminOrders orders={orders} updateOrderStatus={updateOrderStatus} />}
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

const STATUS_ORDER = ['جديد', 'قيد التحضير', 'في الطريق', 'مكتمل'];

function parseLocation(loc) {
  if (!loc) return null;
  const m = loc.match(/Lat:\s*([\d.]+).*Lng:\s*([\d.]+)/i);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

function AdminOrders({ orders, updateOrderStatus }) {
  const { chatMessages, sendMessage } = useContext(StoreContext);
  const [etaInputs, setEtaInputs] = useState({});
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');

  if(orders.length === 0) return <h3 className="empty-orders">لا توجد طلبات حالياً.</h3>;
  const stats = {
    newOrders: orders.filter(o => o.status === 'جديد').length,
    preparing: orders.filter(o => o.status === 'قيد التحضير').length,
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
    let eta = etaInputs[order.id];
    if (newStatus === 'في الطريق' && (!eta || eta <= 0)) {
      eta = prompt('أدخل وقت التوصيل المقدر بالدقائق:', '30');
      if (!eta || isNaN(eta) || eta <= 0) return;
      setEtaInputs(prev => ({ ...prev, [order.id]: eta }));
    }
    try {
      updateOrderStatus(order.id, newStatus, eta ? Number(eta) : undefined);
    } catch (e) {
      alert(e.message);
    }
  };

  const orderChatMessages = (orderId) => chatMessages.filter(m => !m.orderId || m.orderId === orderId);

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
              {orderChatMessages(chatOrder).map(m => (
                <div key={m.id} className={`admin-bubble ${m.sender === 'admin' || m.sender === 'driver' ? 'admin' : 'customer'}`}>
                  <div className="admin-bubble-sender">{m.sender === 'admin' || m.sender === 'driver' ? 'أنت' : 'العميل'}</div>
                  <div>{m.text}</div>
                  <div className="admin-bubble-time">{m.time}</div>
                </div>
              ))}
            </div>
            <div className="order-chat-input">
              <input type="text" value={chatText} onChange={e => setChatText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { sendMessage('driver', chatText, chatOrder); setChatText(''); } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage('driver', chatText, chatOrder); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      <h2 className="admin-section-title">إدارة الطلبات</h2>
      <div className="admin-stats-grid">
        <div className="admin-stat-card"><span>طلبات جديدة</span><strong>{stats.newOrders}</strong></div>
        <div className="admin-stat-card"><span>قيد التحضير</span><strong>{stats.preparing}</strong></div>
        <div className="admin-stat-card"><span>مكتملة</span><strong>{stats.completed}</strong></div>
        <div className="admin-stat-card"><span>المبيعات</span><strong>{stats.revenue.toFixed(2)} ر.س</strong></div>
      </div>
      <div className="admin-orders-list">
        {orders.map(order => (
          <div key={order.id} className="admin-card">
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
              <div className="admin-order-right" style={{textAlign: 'left'}}>
                <strong>الإجمالي:</strong> <span className="order-total-text">{order.total.toFixed(2)} ر.س</span><br/>
                {order.status === 'جديد' ? (
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
                    <option value="في الطريق">في الطريق</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                )}
              </div>
            </div>
            <div>
              <strong>المنتجات المطلوبة:</strong>
              <ul className="order-items-list">
                {order.items.map(item => (
                  <li key={item.id}>{item.name} (الكمية: {item.qty})</li>
                ))}
              </ul>
            </div>
            <div className="admin-card-info">
              <strong>الدفع:</strong> {order.paymentMethod} | <strong>الموقع:</strong> {order.location}
              {order.phone && <><br/><strong>الجوال:</strong> <span dir="ltr">{order.phone}</span> <a href={`https://wa.me/${order.phone.replace(/^0/, '966')}`} target="_blank" className="whatsapp-link" title="واتساب">💬</a></>}
              {order.notes && <><br/><strong>ملاحظات:</strong> {order.notes}</>}
              {(() => {
                const coords = parseLocation(order.location);
                if (coords) return (
                  <div className="admin-location-actions">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`} target="_blank" className="map-link">📍 فتح في خرائط جوجل</a>
                  </div>
                );
                return null;
              })()}
              <div style={{ marginTop: '0.4rem' }}>
                <button className="chat-order-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة الطلب</button>
              </div>
            </div>
          </div>
        ))}
      </div>
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

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleSend = () => {
    if(!text.trim()) return;
    sendMessage('admin', text);
    setText('');
  };

  return (
    <div className="admin-chat-container">
      <h2 className="admin-section-title">خدمة العملاء (محادثات مباشرة)</h2>
      
      <div className="admin-chat-body">
        {chatMessages.length === 0 && <p className="empty-chat">لا توجد رسائل بعد.</p>}
        {chatMessages.map(m => (
          <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}`}>
            <div className="admin-bubble-sender">{m.sender === 'admin' ? 'أنت (التاجر)' : 'العميل'}</div>
            <div>{m.text}</div>
            <div className="admin-bubble-time">{m.time}</div>
          </div>
        ))}
      </div>
      
      <div className="admin-chat-input-area">
        <input 
          type="text" 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyDown={e => e.key==='Enter' && handleSend()}
          placeholder="اكتب ردك للعميل هنا..."
          className="admin-chat-input"
        />
        <button className="btn" onClick={handleSend}>إرسال</button>
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
        redirectTo: window.location.origin + '/thara-app/'
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
