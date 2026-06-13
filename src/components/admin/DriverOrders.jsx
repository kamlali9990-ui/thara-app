import React, { useState, useRef, useEffect, useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import OrderLocationMap from '../OrderLocationMap.jsx';
import VoiceMessage from '../VoiceMessage';
import { parseOrderLocation, getMapLinks } from '../../utils/location.js';
import { showToast } from '../Toast.jsx';
import { printInvoice } from '../../utils/printInvoice.js';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../../hooks/useAudioRecorder';

const FEATURED_ORDER_KEY = 'thara_featured_ids';

export default function DriverOrders() {
  const {
    orders, updateOrderStatus, chatMessages, sendMessage, currentStaff,
    allCustomers, staffList, claimOrder, allProducts
  } = useContext(StoreContext);

  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');
  const audio = useAudioRecorder();
  const chatBodyRef = useRef(null);

  const toggleExpand = (id) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const myOrders = orders.filter(o => o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id));
  const active = myOrders.filter(o => o.status !== 'مكتمل' && o.status !== 'ملغي' && o.status !== 'تم التوصيل');
  const completed = myOrders.filter(o => o.status === 'مكتمل');
  const delivered = myOrders.filter(o => o.status === 'تم التوصيل');
  const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0);

  const doUpdate = async (order, status) => {
    try {
      await updateOrderStatus(order.id, status);
      showToast(`تم تحديث الطلب إلى: ${status}`, 'success');
    } catch (err) {
      showToast('فشل التحديث: ' + (err.message || ''), 'error');
    }
  };

  const getStatusMeta = (status) => {
    const map = {
      'جديد':         { icon: '🔵', label: 'جديد' },
      'قيد التحضير':  { icon: '🟡', label: 'تجهيز' },
      'جاهز للتوصيل': { icon: '🟢', label: 'جاهز' },
      'في الطريق':    { icon: '🔷', label: 'بالتوصيل' },
      'تم التوصيل':   { icon: '✅', label: 'تم التوصيل' },
      'مكتمل':        { icon: '✔️', label: 'مكتمل' },
      'ملغي':         { icon: '❌', label: 'ملغي' },
    };
    return map[status] || { icon: '◻️', label: status };
  };

  const getStatusClass = (status) => {
    const map = {
      'جديد': 'status-new',
      'قيد التحضير': 'status-preparing',
      'جاهز للتوصيل': 'status-ready',
      'في الطريق': 'status-route',
      'تم التوصيل': 'status-delivered',
      'مكتمل': 'status-completed',
      'ملغي': 'status-cancelled',
    };
    return map[status] || '';
  };

  const sendChatMessage = async () => {
    if (!chatText.trim() && !audio.recordedBlob) return;
    try {
      await sendMessage({ orderId: chatOrder, text: chatText.trim(), sender: 'admin' });
      setChatText('');
      audio.clearRecording();
    } catch (err) {
      showToast('فشل الإرسال', 'error');
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    return new Date(dateStr).toLocaleDateString('ar-SA');
  };

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatOrder, chatMessages]);

  const renderOrderActions = (order) => {
    if (order.status === 'جديد') {
      return (
        <button type="button" className="btn driver-action-btn" onClick={() => doUpdate(order, 'قيد التحضير')}
          style={{ background: '#f59e0b', color: '#fff' }}>
          تجهيز الطلب
        </button>
      );
    }
    if (order.status === 'قيد التحضير') {
      return (
        <button type="button" className="btn driver-action-btn driver-action-route" onClick={() => doUpdate(order, 'في الطريق')}
          style={{ background: '#3b82f6', color: '#fff' }}>
          بدء التوصيل
        </button>
      );
    }
    if (order.status === 'جاهز للتوصيل') {
      return (
        <button type="button" className="btn driver-action-btn driver-action-route" onClick={() => doUpdate(order, 'في الطريق')}
          style={{ background: '#3b82f6', color: '#fff' }}>
          بدء التوصيل
        </button>
      );
    }
    if (order.status === 'في الطريق') {
      return (
        <button type="button" className="btn driver-action-btn driver-action-done" onClick={() => doUpdate(order, 'تم التوصيل')}
          style={{ background: '#10b981', color: '#fff' }}>
          تم التوصيل
        </button>
      );
    }
    if (order.status === 'تم التوصيل') {
      return <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>بانتظار تأكيد الإدارة</span>;
    }
    return null;
  };

  const renderChatModal = () => {
    if (!chatOrder) return null;
    const orderMsgs = chatMessages.filter(m => m.orderId === chatOrder);
    return (
      <div className="confirm-overlay" onClick={() => setChatOrder(null)}>
        <div className="admin-chat-modal" onClick={e => e.stopPropagation()}
          style={{ width: '90%', maxWidth: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
          <div className="admin-chat-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
            <strong>💬 محادثة الطلب #{chatOrder.slice(-6)}</strong>
            <button onClick={() => setChatOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
          <div ref={chatBodyRef} className="admin-chat-body" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {orderMsgs.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>لا توجد رسائل بعد</p>}
            {orderMsgs.map(m => (
              <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'} ${m.status === 'read' ? 'read' : ''}`}
                style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                {isVoiceMessage(m.text) ? (
                  <VoiceMessage url={getVoiceUrl(m.text)} />
                ) : (
                  <span>{m.text}</span>
                )}
              </div>
            ))}
          </div>
          <div className="admin-chat-input-area" style={{ borderTop: '1px solid #e5e7eb', padding: '0.5rem', display: 'flex', gap: '0.4rem' }}>
            <button onClick={audio.toggleRecording} className="admin-chat-voice-btn"
              style={{ background: audio.isRecording ? '#ef4444' : '#e5e7eb', border: 'none', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              {audio.isRecording ? '⬤ تسجيل' : '🎤'}
            </button>
            <input value={chatText} onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
              placeholder="اكتب رسالة..." className="admin-chat-input"
              style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem' }} />
            <button onClick={sendChatMessage} className="admin-chat-send-btn"
              style={{ background: '#127443', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              إرسال
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrderCard = (order) => {
    const isExpanded = expandedOrders.has(order.id);
    const meta = getStatusMeta(order.status);
    const coords = parseOrderLocation(order.location);
    const links = coords ? getMapLinks(coords) : null;

    return (
      <div key={order.id} className={`admin-card order-card ${getStatusClass(order.status)} ${isExpanded ? 'order-card-expanded' : ''} is-driver-view`}
        style={{ marginBottom: '0.6rem' }}>
        {/* Compact strip */}
        <div className={`order-compact ${isExpanded ? 'order-compact-open' : ''}`} onClick={() => toggleExpand(order.id)}>
          <div className="order-compact-status">
            <span className="order-status-pill">
              <span className="order-status-icon">{meta.icon}</span>
              <span className="order-status-label">{meta.label}</span>
            </span>
          </div>
          <div className="order-compact-main">
            <span className="order-compact-id">#{order.id.slice(-6)}</span>
            <span className="order-compact-time">{timeAgo(order.date)}</span>
            {order.phone && <span className="order-compact-phone" dir="ltr">{order.phone}</span>}
            {order.deliveryAddress && <span className="order-compact-addr" title={order.deliveryAddress}>📍{order.deliveryAddress.slice(0, 18)}{order.deliveryAddress.length > 18 ? '…' : ''}</span>}
          </div>
          <div className="order-compact-total">
            <span className="order-compact-price">{order.total?.toFixed(2)}</span>
            <span className="order-compact-currency"> ر.س</span>
          </div>
          <span className={`order-expand-icon ${isExpanded ? 'expanded' : ''}`}>{isExpanded ? '▲' : '▼'}</span>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="order-details">
            <div className="order-details-inner">
              {/* Action button */}
              <div style={{ marginBottom: '0.6rem' }}>
                {renderOrderActions(order)}
              </div>

              {/* ETA */}
              {order.estimatedDelivery && (
                <div style={{ fontSize: '0.85rem', color: '#127443', marginBottom: '0.5rem', fontWeight: 600 }}>
                  ⏱ وقت التوصيل المتوقع: {order.estimatedDelivery} دقيقة
                </div>
              )}

              {/* Customer info */}
              <div className="order-info-section">
                <div className="order-info-row">
                  <span className="order-info-label">👤 العميل</span>
                  <span className="order-info-value">{order.customerName || order.name || '—'}</span>
                </div>
                {order.phone && (
                  <div className="order-info-row">
                    <span className="order-info-label">📞 الهاتف</span>
                    <span className="order-info-value" dir="ltr">
                      {order.phone}
                      <a href={`tel:${order.phone}`} className="order-action-link" title="اتصال">📞</a>
                      <a href={`https://wa.me/${order.phone.replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer" className="order-action-link" title="واتساب">💬</a>
                    </span>
                  </div>
                )}
                {order.deliveryAddress && (
                  <div className="order-info-row">
                    <span className="order-info-label">📍 العنوان</span>
                    <span className="order-info-value">{order.deliveryAddress}</span>
                  </div>
                )}
                <div className="order-info-row">
                  <span className="order-info-label">💳 الدفع</span>
                  <span className="order-info-value">{order.paymentMethod || '—'}</span>
                </div>
                {order.notes && (
                  <div className="order-info-row">
                    <span className="order-info-label">📝 ملاحظات</span>
                    <span className="order-info-value" style={{ color: '#dc2626' }}>{order.notes}</span>
                  </div>
                )}
              </div>

              {/* Products */}
              {order.items && order.items.length > 0 && (
                <div className="order-products-section" style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>🛒 المنتجات</h4>
                  {order.items.map((item, i) => (
                    <div key={i} className="order-product-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9' }}>
                      <span>{item.name}</span>
                      <span style={{ color: '#64748b' }}>×{item.quantity || 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Map */}
              {coords && (
                <div style={{ marginTop: '0.5rem', borderRadius: 12, overflow: 'hidden' }}>
                  <OrderLocationMap location={order.location} />
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <a href={links.googleDir} target="_blank" rel="noopener noreferrer" className="order-action-link"
                      style={{ flex: 1, textAlign: 'center', padding: '0.35rem', background: '#ea4335', color: '#fff', borderRadius: 8, fontSize: '0.8rem', textDecoration: 'none' }}>
                      🗺️ Google Maps
                    </a>
                    <a href={links.osmDir} target="_blank" rel="noopener noreferrer" className="order-action-link"
                      style={{ flex: 1, textAlign: 'center', padding: '0.35rem', background: '#127443', color: '#fff', borderRadius: 8, fontSize: '0.8rem', textDecoration: 'none' }}>
                      🗺️ OpenStreetMap
                    </a>
                  </div>
                </div>
              )}

              {/* Action buttons row */}
              <div className="order-actions" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={() => setChatOrder(order.id)} className="btn"
                  style={{ flex: 1, padding: '0.35rem', fontSize: '0.8rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  💬 محادثة
                </button>
                <button onClick={() => printInvoice(order, allProducts || [])} className="btn"
                  style={{ flex: 1, padding: '0.35rem', fontSize: '0.8rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  🖨️ طباعة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [tab, setTab] = useState('active');

  return (
    <div style={{ padding: '1rem' }}>
      <h2 className="admin-section-title">🏍️ نشاطي</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'إجمالي الطلبات', value: myOrders.length },
          { label: 'قيد التوصيل', value: active.length },
          { label: 'تم التوصيل', value: delivered.length },
          { label: 'مكتمل', value: completed.length },
          { label: 'إيرادات', value: revenue.toFixed(0) + ' ر.س' },
        ].map(c => (
          <div key={c.label} className="admin-stat-card-bg">
            <div className="admin-stat-label">{c.label}</div>
            <div className="admin-stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button className={`admin-sub-tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}
          style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
          🔄 قيد التوصيل ({active.length})
        </button>
        <button className={`admin-sub-tab-btn ${tab === 'delivered' ? 'active' : ''}`} onClick={() => setTab('delivered')}
          style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
          ✅ تم التوصيل ({delivered.length})
        </button>
        <button className={`admin-sub-tab-btn ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}
          style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
          ✔️ مكتمل ({completed.length})
        </button>
      </div>

      {/* Orders list */}
      <div className="admin-orders-list">
        {(tab === 'active' ? active : tab === 'delivered' ? delivered : completed).length === 0 ? (
          <div className="admin-empty-state">
            {tab === 'active' ? 'لا توجد طلبات نشطة حالياً.' : tab === 'delivered' ? 'لا توجد طلبات بانتظار التأكيد.' : 'لا توجد طلبات مكتملة.'}
          </div>
        ) : (
          (tab === 'active' ? active : tab === 'delivered' ? delivered : completed).map(order => renderOrderCard(order))
        )}
      </div>

      {renderChatModal()}
    </div>
  );
}
