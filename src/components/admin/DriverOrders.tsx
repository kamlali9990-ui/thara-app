import React, { useState, useRef, useEffect, useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import OrderLocationMap from '../OrderLocationMap';
import VoiceMessage from '../VoiceMessage';
import { parseOrderLocation, getMapLinks } from '../../utils/location';
import { showToast } from '../Toast';
import { printInvoice } from '../../utils/printInvoice';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../../hooks/useAudioRecorder';
import type { Order, ChatMessage } from '../../types';

export default function DriverOrders() {
  const {
    orders, updateOrderStatus, updateDriverLocation, chatMessages, sendMessage, currentStaff,
    allProducts
  } = useContext(StoreContext);

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [chatOrder, setChatOrder] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [sharingLocations, setSharingLocations] = useState<Record<string, boolean>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string | null>>({});
  const watchIdRefs = useRef<Record<string, number>>({});
  const audio = useAudioRecorder();
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const startSharing = (order: Order) => {
    if (!navigator.geolocation) {
      setLocationErrors(prev => ({ ...prev, [order.id]: 'الموقع غير متاح في هذا المتصفح' }));
      return;
    }
    if (sharingLocations[order.id]) return;

    setSharingLocations(prev => ({ ...prev, [order.id]: true }));
    setLocationErrors(prev => ({ ...prev, [order.id]: null }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateDriverLocation(order.id, latitude, longitude).catch(() => {});
        setLocationErrors(prev => ({ ...prev, [order.id]: null }));
      },
      (err) => {
        setLocationErrors(prev => ({ ...prev, [order.id]: err.message }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    watchIdRefs.current[order.id] = watchId;
  };

  useEffect(() => {
    return () => {
      Object.values(watchIdRefs.current).forEach(id => navigator.geolocation.clearWatch(id));
      watchIdRefs.current = {};
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doUpdate = async (order: Order, status: string) => {
    try {
      await updateOrderStatus(order.id, status as any);
      showToast(`تم تحديث الطلب إلى: ${status}`, 'success');
      if (status === 'في الطريق') startSharing(order);
    } catch (err: any) {
      showToast('فشل التحديث: ' + (err.message || ''), 'error');
    }
  };

  const myOrders = orders.filter((o: Order) => o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id))
    .sort((a: Order, b: Order) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const activeOrders = myOrders.filter((o: Order) => o.status !== 'مكتمل' && o.status !== 'ملغي');
  const completedOrders = myOrders.filter((o: Order) => o.status === 'مكتمل');

  // Auto-start location sharing for orders already on the way
  useEffect(() => {
    activeOrders.forEach((order: Order) => {
      if (order.status === 'في الطريق' && !sharingLocations[order.id] && !watchIdRefs.current[order.id]) {
        startSharing(order);
      }
    });
  }, [orders]);

  const getStatusMeta = (status: string) => {
    const map: Record<string, { icon: string; label: string }> = {
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

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
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
    if (!chatText.trim() && !(audio as any).recordedBlob) return;
    try {
      await sendMessage(currentStaff?.role === 'driver' ? 'driver' : 'admin', chatText.trim(), chatOrder ?? undefined);
      setChatText('');
      audio.cancelRecording();
    } catch (err) {
      showToast('فشل الإرسال', 'error');
    }
  };

  const timeAgo = (dateStr: string) => {
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

  const renderOrderActions = (order: Order) => {
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
    const orderMsgs = chatMessages.filter((m: ChatMessage) => m.orderId === chatOrder);
    return (
      <div className="confirm-overlay" onClick={() => setChatOrder(null)}>
        <div className="admin-chat-modal" onClick={e => e.stopPropagation()}>
          <div className="admin-chat-modal-header">
            <strong>💬 محادثة الطلب #{chatOrder.slice(-6)}</strong>
            <button onClick={() => setChatOrder(null)} className="admin-chat-modal-close">✕</button>
          </div>
          <div ref={chatBodyRef} className="admin-chat-body">
            {orderMsgs.length === 0 && <p className="admin-empty-state" style={{ margin: 0 }}>لا توجد رسائل بعد</p>}
            {orderMsgs.map((m: ChatMessage) => (
              <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}`}>
                {isVoiceMessage(m.text) ? (
                  <VoiceMessage url={getVoiceUrl(m.text ?? '') ?? ''} />
                ) : (
                  <span>{m.text}</span>
                )}
              </div>
            ))}
          </div>
          <div className="admin-chat-input-area">
            <button onClick={() => { if (audio.recording) { audio.stopRecording().catch(() => {}); } else { audio.startRecording().catch(() => {}); } }} className={`admin-chat-voice-btn ${audio.recording ? 'recording' : ''}`}>
              {audio.recording ? '⬤ تسجيل' : '🎤'}
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

  const renderOrderCard = (order: Order) => {
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
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="order-product-row">
                      <span>{item.name}</span>
                      <span className="order-product-qty">×{item.quantity || 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {coords && (
                <div className="driver-map-wrap">
                  <OrderLocationMap lat={coords.lat} lng={coords.lng} />
                  <div className="driver-map-links">
                    <a href={links!.googleDir} target="_blank" rel="noopener noreferrer" className="driver-map-link google">🗺️ Google Maps</a>
                    <a href={links!.osmDir} target="_blank" rel="noopener noreferrer" className="driver-map-link osm">🗺️ OpenStreetMap</a>
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
                <button onClick={() => printInvoice(order as any, allProducts as any)} className="order-action-btn print">🖨️ طباعة</button>
                {order.status === 'في الطريق' && (
                  <div className="driver-location-sharing">
                    <span className="driver-location-dot"></span>
                    <span>مشاركة الموقع نشطة</span>
                  </div>
                )}
              </div>
              {locationErrors[order.id] && (
                <div className="driver-location-error">
                  ⚠️ {locationErrors[order.id]}
                </div>
              )}
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
          activeOrders.map((order: Order) => renderOrderCard(order))
        )}
      </div>

      {completedOrders.length > 0 && (
        <>
          <h3 className="admin-sub-section-title" style={{marginBottom:'0.75rem',marginTop:'1.5rem'}}>✅ تم التوصيل ({completedOrders.length})</h3>
          <div className="admin-orders-list">
            {completedOrders.map((order: Order) => renderOrderCard(order))}
          </div>
        </>
      )}

      {renderChatModal()}
    </div>
  );
}
