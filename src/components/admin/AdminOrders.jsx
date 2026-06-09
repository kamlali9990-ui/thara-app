import React, { useContext, useState, useRef, useEffect } from 'react';
import { StoreContext } from '../../context/StoreContext';
import OrderLocationMap from '../OrderLocationMap.jsx';
import { parseOrderLocation, getMapLinks } from '../../utils/location.js';
import { showToast } from '../Toast.jsx';
import { printInvoice } from '../../utils/printInvoice.js';

const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];

export default function AdminOrders({ orders, updateOrderStatus, staffRole, currentStaff, isDriver, drivers, assignDriverToOrder, claimOrder, allCustomers = [], staffList = [] }) {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, archiveOrder, restoreOrder, archivedOrders, loadArchivedOrders } = useContext(StoreContext);
  const [etaInputs, setEtaInputs] = useState({});
  const [confirmMsg, setConfirmMsg] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeDriverTab, setActiveDriverTab] = useState('available');
  const [etaModalOrder, setEtaModalOrder] = useState(null);
  const [etaModalValue, setEtaModalValue] = useState('30');

  useEffect(() => {
    if (showArchived && archivedOrders.length === 0) loadArchivedOrders();
  }, [showArchived]);

  // Auto-mark order chat messages as read when modal opens
  useEffect(() => {
    if (!chatOrder) return;
    const unreadIds = chatMessages
      .filter(m => (!m.orderId || m.orderId === chatOrder) && m.sender === 'customer' && m.status !== 'read')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markMessagesAsRead(unreadIds);
    }
  }, [chatOrder]);

  if(orders.length === 0) return <h3 className="empty-orders">لا توجد طلبات حالياً.</h3>;
  const stats = {
    newOrders: orders.filter(o => o.status === 'جديد').length,
    preparing: orders.filter(o => o.status === 'قيد التحضير').length,
    ready: orders.filter(o => o.status === 'جاهز للتوصيل').length,
    onRoute: orders.filter(o => o.status === 'في الطريق').length,
    delivered: orders.filter(o => o.status === 'تم التوصيل').length,
    completed: orders.filter(o => o.status === 'مكتمل').length,
    revenue: orders.filter(o => o.status !== 'ملغي').reduce((sum, o) => sum + Number(o.total || 0), 0)
  };

const handleStatusChange = (order, newStatus) => {
  const ci = STATUS_ORDER.indexOf(order.status);
  const ni = STATUS_ORDER.indexOf(newStatus);
  if (newStatus !== 'ملغي' && ni < ci) {
    // Only allow one step backward for manager corrections
    if (ni < ci - 1) {
      showToast('لا يمكن إرجاع الطلب أكثر من خطوة واحدة', 'error');
      return;
    }
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
      showToast(e.message, 'error');
    }
  };

  const confirmEtaModal = () => {
    const order = etaModalOrder;
    if (!order) return;
    const eta = etaModalValue;
    if (!eta || isNaN(eta) || Number(eta) <= 0) {
      showToast('الرجاء إدخال وقت توصيل صحيح', 'warning');
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
    if (status === 'تم التوصيل') return 'status-delivered';
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
                showToast('تم قبول الطلب بنجاح', 'success');
              } catch (err) {
                showToast('فشل قبول الطلب: ' + (err.message || 'خطأ غير معروف'), 'error');
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
        <button type="button" className="btn driver-action-btn driver-action-done" onClick={() => doUpdate(order, 'تم التوصيل')}>
          تم التوصيل
        </button>
      );
    }
    if (order.status === 'تم التوصيل') {
      return <span className="driver-status-done" style={{ color: '#fbbf24' }}>بانتظار تأكيد الإدارة</span>;
    }
    return <span className="driver-status-done">مكتمل</span>;
  };

  const renderOrderCard = (order, { compact = false } = {}) => (
    <div
      key={order.id}
      className={`admin-card order-card ${order.status === 'مكتمل' || order.status === 'تم التوصيل' ? 'order-card-completed' : 'order-card-active'} ${getStatusClass(order.status)}`}
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
              staffRole === 'manager' || staffRole === 'employee' ? (
                order.status === 'جديد' ? (
                  <button
                    onClick={() => doUpdate(order, 'قيد التحضير')}
                    className="btn btn-accept"
                  >
                    استلام الطلب
                  </button>
                ) : order.status === 'تم التوصيل' ? (
                  <button
                    onClick={() => doUpdate(order, 'مكتمل')}
                    className="btn btn-accept"
                    style={{ background: '#10b981' }}
                  >
                    ✅ تأكيد التوصيل
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
                    <option value="تم التوصيل">تم التوصيل</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                )
              ) : order.status === 'جديد' ? (
                <button
                  onClick={() => doUpdate(order, 'قيد التحضير')}
                  className="btn btn-accept"
                >
                  استلام الطلب
                </button>
              ) : order.status === 'تم التوصيل' ? (
                <button
                  onClick={() => doUpdate(order, 'مكتمل')}
                  className="btn btn-accept"
                  style={{ background: '#10b981' }}
                >
                  ✅ تأكيد التوصيل
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
                  <option value="تم التوصيل">تم التوصيل</option>
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

        {/* Driver assignment dropdown for admin/manager only */}
        {!compact && !isDriver && (staffRole === 'admin' || staffRole === 'manager') && (
          <div className="admin-assign-driver-block" style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>🚚 تعيين الكابتن:</strong>
            <select
              value={order.assignedDriverId || ''}
              onChange={async (e) => {
                const val = e.target.value;
                try {
                  await assignDriverToOrder(order.id, val ? Number(val) : null);
                  showToast('تم تحديث تعيين الكابتن بنجاح', 'success');
                } catch (err) {
                  showToast('فشل تعيين الكابتن: ' + (err.message || 'خطأ غير معروف'), 'error');
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
                ✓ معين لـ {drivers.find(d => String(d.id) === String(order.assignedDriverId))?.name || 'كابتن'}
              </span>
            )}
          </div>
        )}

        {/* Display assigned driver name for drivers */}
        {!compact && isDriver && order.assignedDriverId && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#fbbf24' }}>
            🏍️ الكابتن المكلف بالطلب: <strong>{String(order.assignedDriverId) === String(currentStaff?.id) ? 'أنت' : (drivers.find(d => String(d.id) === String(order.assignedDriverId))?.name || 'كابتن آخر')}</strong>
          </div>
        )}

        <div style={{ marginTop: '0.4rem' }}>
          <button type="button" className="chat-order-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة الطلب</button>
          <button type="button" className="chat-order-btn" style={{ marginRight: '0.4rem' }} onClick={() => printInvoice(order, { currentStaff, drivers, customers: allCustomers, staffList })}>🖨️ طباعة الفاتورة</button>
          {!compact && staffRole === 'admin' && (
            <button type="button" className="admin-delete-btn" style={{ marginTop: '0.4rem' }}
              onClick={() => {
                setConfirmMsg({
                  text: `هل أنت متأكد من أرشفة الطلب #${String(order.id).slice(-6)}؟`,
                  onConfirm: async () => {
                    setConfirmMsg(null);
                    try {
                      await archiveOrder(order.id);
                      showToast('تم أرشفة الطلب بنجاح', 'success');
                    } catch (err) {
                      showToast('فشل أرشفة الطلب: ' + (err.message || ''), 'error');
                    }
                  }
                });
              }}>
              📦 أرشفة الطلب
            </button>
          )}
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
                  if (msg.sender === senderRole) return msg.senderName || 'أنت';
                  if (msg.sender === 'customer') return 'العميل';
                  if (msg.sender === 'driver') {
                    const o = orders.find(x => x.id === chatOrder);
                    const dName = msg.senderName || (o ? drivers.find(d => String(d.id) === String(o.assignedDriverId))?.name : null);
                    return dName ? `الكابتن (${dName})` : 'الكابتن';
                  }
                  if (msg.sender === 'admin') {
                    return msg.senderName || 'المتجر / الدعم';
                  }
                  return msg.sender;
                };
                return (
                  <div key={m.id} className={`admin-bubble ${isMe ? 'admin' : 'customer'}`}>
                    <div className="admin-bubble-sender">{getSenderLabel(m)}</div>
                    <div>{m.text}</div>
                    <div className="admin-bubble-time">
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', marginRight: '0.2rem' }}>
                          {m._failed ? (
                            <button onClick={() => retrySendMessage(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.65rem' }}>⚠️ إعادة</button>
                          ) : m.status === 'read' ? (
                            <span title="مقروءة" style={{ color: '#34c759' }}>✓✓</span>
                          ) : (
                            <span title="تم الإرسال" style={{ color: '#94a3b8' }}>✓</span>
                          )}
                        </span>
                      )}
                      {m.time}
                    </div>
                  </div>
                );
              })}
              {typingUsers[chatOrder] && (
                <div className="admin-bubble customer" style={{ opacity: 0.6 }}>
                  <div className="admin-bubble-sender">العميل</div>
                  <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>يكتب...</div>
                </div>
              )}
            </div>
            <div className="order-chat-input">
                <input type="text" value={chatText} onChange={e => { setChatText(e.target.value); sendTyping(chatOrder, null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { if (chatText.trim()) { const o = orders.find(x => x.id === chatOrder); sendMessage(senderRole, chatText, chatOrder, null, currentStaff?.name, o?.phone); setChatText(''); } } }}
                  placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { const o = orders.find(x => x.id === chatOrder); sendMessage(senderRole, chatText, chatOrder, null, currentStaff?.name, o?.phone); setChatText(''); } }}>إرسال</button>
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
      <h2 className="admin-section-title orders-title">{isDriver ? 'طلبات التوصيل' : 'إدارة الطلبات'}</h2>
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
          <div className="admin-stat-card"><span>تم التوصيل</span><strong>{stats.delivered}</strong></div>
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

      {staffRole === 'admin' && (
        <div className="completed-orders-section" style={{ marginTop: '0.75rem' }}>
          <button
            className="completed-toggle-btn"
            onClick={() => setShowArchived(prev => !prev)}
            style={{ borderColor: '#64748b' }}
          >
            {showArchived ? '▾' : '▸'} 📦 أرشيف الطلبات ({archivedOrders.length})
          </button>
          {showArchived && (
            <div className="admin-orders-list completed-orders-list">
              {archivedOrders.length === 0 ? (
                <div className="empty-orders" style={{ color: '#64748b' }}>لا توجد طلبات في الأرشيف.</div>
              ) : (
                archivedOrders.map(order => (
                  <div key={order.id} style={{ position: 'relative' }}>
                    {renderOrderCard(order, { compact: true })}
                    <div style={{ padding: '0 0.75rem 0.75rem', marginTop: '-0.5rem' }}>
                      <button type="button" className="chat-order-btn" onClick={async () => {
                        try {
                          await restoreOrder(order.id);
                          showToast('تم استعادة الطلب', 'success');
                        } catch (err) {
                          showToast('فشل استعادة الطلب', 'error');
                        }
                      }}>↩️ استعادة الطلب</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
