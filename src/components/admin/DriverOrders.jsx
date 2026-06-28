import React, { useState, useRef, useEffect, useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import OrderLocationMap from '../OrderLocationMap.jsx';
import VoiceMessage from '../VoiceMessage';
import { parseOrderLocation, getMapLinks } from '../../utils/location.js';
import { showToast } from '../Toast.jsx';
import { printInvoice } from '../../utils/printInvoice.js';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../../hooks/useAudioRecorder';

export default function DriverOrders() {
  const {
    orders, updateOrderStatus, chatMessages, sendMessage, currentStaff,
    allProducts
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

  const myOrders = orders.filter(o => o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const activeOrders = myOrders.filter(o => o.status !== 'مكتمل' && o.status !== 'ملغي');
  const completedOrders = myOrders.filter(o => o.status === 'مكتمل');

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
      await sendMessage({ orderId: chatOrder, text: chatText.trim(), sender: currentStaff?.role === 'driver' ? 'driver' : 'admin' });
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
        <button type="button" className="btn driver-action-btn driver-action-accept" onClick={() => doUpdate(order, 'قيد التحضير')}>
          تجهيز الطلب
        </button>
      );
    }
    if (order.status === 'قيد التحضير' || order.status === 'جاهز للتوصيل') {
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
      return <span className="driver-status-waiting">بانتظار تأكيد الإدارة</span>;
    }
    return null;
  };

  const renderChatModal = () => {
    if (!chatOrder) return null;
    const orderMsgs = chatMessages.filter(m => m.orderId === chatOrder);
    return (
      <div className="confirm-overlay" onClick={() => setChatOrder(null)}>
        <div className="admin-chat-modal" onClick={e => e.stopPropagation()}>
          <div className="admin-chat-modal-header">
            <strong>💬 محادثة الطلب #{chatOrder.slice(-6)}</strong>
            <button onClick={() => setChatOrder(null)} className="admin-chat-modal-close">✕</button>
          </div>
          <div ref={chatBodyRef} className="admin-chat-body">
            {orderMsgs.length === 0 && <p className="admin-empty-state" style={{ margin: 0 }}>لا توجد رسائل بعد</p>}
            {orderMsgs.map(m => (
              <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}`}>
                {isVoiceMessage(m.text) ? (
                  <VoiceMessage url={getVoiceUrl(m.text)} />
                ) : (
                  <span>{m.text}</span>
                )}
              </div>
            ))}
          </div>
          <div className="admin-chat-input-area">
            <button onClick={audio.toggleRecording} className={`admin-chat-voice-btn ${audio.isRecording ? 'recording' : ''}`}>
              {audio.isRecording ? '⬤ تسجيل' : '🎤'}
            </button>
            <input value={chatText} onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
              placeholder="اكتب رسالة..." className="admin-chat-input" />
            <button onClick={sendChatMessage} className="admin-chat-send-btn">إرسال</button>
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
    const isMine = String(order.assignedDriverId) === String(currentStaff?.id);

    return (
      <div key={order.id} className={`admin-card order-card ${getStatusClass(order.status)} ${isExpanded ? 'order-card-expanded' : ''} is-driver-view`}>
        <div className={`order-compact ${isExpanded ? 'order-compact-open' : ''}`} onClick={() => toggleExpand(order.id)}>
          <div className="order-compact-status">
            <span className="order-status-icon-sm">{meta.icon}</span>
          </div>
          <div className="order-compact-main">
            <span className="order-compact-id">#{order.id.slice(-6)}</span>
            <span className="order-compact-label">{meta.label}</span>
            <span className="order-compact-time">{timeAgo(order.date)}</span>
            {order.deliveryAddress && <span className="order-compact-addr" title={order.deliveryAddress}>📍{order.deliveryAddress.slice(0, 18)}{order.deliveryAddress.length > 18 ? '…' : ''}</span>}
          </div>
          <div className="order-compact-total">
            {order.total?.toFixed(2)}<small> ر.س</small>
          </div>
          <span className={`order-compact-expand ${isExpanded ? 'expanded' : ''}`}>{isExpanded ? '▲' : '▼'}</span>
        </div>

        {isExpanded && (
          <div className="order-details">
            <div className="order-details-inner">
              <div className="driver-action-wrap">
                {renderOrderActions(order)}
              </div>

              {order.estimatedDelivery && (
                <div className="driver-eta">⏱ وقت التوصيل المتقدم: {order.estimatedDelivery} دقيقة</div>
              )}

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
                    <span className="order-info-value order-notes">{order.notes}</span>
                  </div>
                )}
              </div>

              {order.items && order.items.length > 0 && (
                <div className="order-products-section">
                  <h4>🛒 المنتجات</h4>
                  {order.items.map((item, i) => (
                    <div key={i} className="order-product-row">
                      <span>{item.name}</span>
                      <span className="order-product-qty">×{item.quantity || 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {coords && (
                <div className="driver-map-wrap">
                  <OrderLocationMap location={order.location} />
                  <div className="driver-map-links">
                    <a href={links.googleDir} target="_blank" rel="noopener noreferrer" className="driver-map-link google">🗺️ Google Maps</a>
                    <a href={links.osmDir} target="_blank" rel="noopener noreferrer" className="driver-map-link osm">🗺️ OpenStreetMap</a>
                  </div>
                  <div className="driver-coords-row">
                    <span className="driver-coords-text">📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                    {order.phone && (
                      <a href={`https://wa.me/${order.phone.replace(/^\+/, '')}?text=${encodeURIComponent('الرجاء تأكيد موقعك على الخريطة: https://maps.google.com/?q=' + coords.lat + ',' + coords.lng)}`}
                        target="_blank" rel="noopener noreferrer" className="driver-coords-wa"
                        title="التواصل عبر واتساب لموقع أدق">
                        📱 التواصل عبر واتساب لموقع أدق
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="order-actions">
                <button onClick={() => setChatOrder(order.id)} className="order-action-btn chat">💬 محادثة</button>
                <button onClick={() => printInvoice(order, allProducts || [])} className="order-action-btn print">🖨️ طباعة</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="driver-orders-wrapper">
      <h2 className="admin-section-title">🏍️ نشاطي</h2>

      <h3 className="admin-sub-section-title" style={{marginBottom:'0.75rem'}}>📦 الطلبات المكلف بها ({activeOrders.length})</h3>
      <div className="admin-orders-list">
        {activeOrders.length === 0 ? (
          <div className="admin-empty-state">لا توجد طلبات مكلف بها حالياً</div>
        ) : (
          activeOrders.map(order => renderOrderCard(order))
        )}
      </div>

      {completedOrders.length > 0 && (
        <>
          <h3 className="admin-sub-section-title" style={{marginBottom:'0.75rem',marginTop:'1.5rem'}}>✅ تم التوصيل ({completedOrders.length})</h3>
          <div className="admin-orders-list">
            {completedOrders.map(order => renderOrderCard(order))}
          </div>
        </>
      )}

      {renderChatModal()}
    </div>
  );
}
