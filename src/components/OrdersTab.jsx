import { memo, useContext, useEffect, useState, useRef } from 'react';
import { StoreContext } from '../context/StoreContext';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../hooks/useAudioRecorder';
import VoiceMessage from '../components/VoiceMessage';
import { parseOrderLocation, getMapLinks } from '../utils/location';

const STATUS_LABELS = {
  'جديد': { text: '🕐 بانتظار الاستلام', icon: '📋' },
  'قيد التحضير': { text: '👨‍🍳 يتم تجهيز طلبك', icon: '👨‍🍳' },
  'جاهز للتوصيل': { text: '🏍️ طلبك جاهز - بانتظار الكابتن', icon: '🏍️' },
  'في الطريق': { text: '🚚 طلبك في الطريق', icon: '🚚' },
  'تم التوصيل': { text: '✅ تم التوصيل - بانتظار التأكيد', icon: '✅' },
  'مكتمل': { text: '🎉 تم التوصيل بنجاح', icon: '🎉' },
  'ملغي': { text: '❌ ملغي', icon: '❌' },
};

const OrdersTab = memo(({ orders, loadOrders }) => {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, customerProfile } = useContext(StoreContext);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const audio = useAudioRecorder();
  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (!loadOrders) return;
    const interval = setInterval(() => {
      loadOrders();
      setLastUpdate(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const formatETA = (minutes) => {
    if (!minutes) return null;
    const now = new Date();
    now.setMinutes(now.getMinutes() + Number(minutes));
    return now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const orderChatMsgs = (orderId) => chatMessages.filter(m => !m.orderId || m.orderId === orderId);

  useEffect(() => {
    if (chatOrder) {
      const unreadIds = orderChatMsgs(chatOrder).filter(m => m.sender !== 'customer' && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0) markMessagesAsRead(unreadIds);
    }
  }, [chatOrder]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatOrder, chatMessages]);

  if (!orders.length) return (
    <div className="empty-tab">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <h3>لا توجد طلبات سابقة</h3>
      <p>عند تقديم طلب جديد، ستظهر طلباتك هنا</p>
    </div>
  );
  return (
    <div className="orders-tab">
      <h2 className="orders-tab-title">طلباتي</h2>
      {chatOrder && (
        <div className="custom-chat-overlay" onClick={() => { setChatOrder(null); setChatText(''); }}>
          <div className="custom-chat-dialog" onClick={e => e.stopPropagation()}>
            <div className="custom-chat-header">
              <strong>محادثة الطلب #{chatOrder.slice(-6)}</strong>
              <button className="custom-chat-close" onClick={() => { setChatOrder(null); setChatText(''); }}>✕</button>
            </div>
            <div className="custom-chat-body" ref={chatBodyRef}>
              {orderChatMsgs(chatOrder).length === 0 && <p className="custom-chat-empty">لا توجد رسائل بعد.</p>}
              {orderChatMsgs(chatOrder).map((m, i) => {
                const msgs = orderChatMsgs(chatOrder);
                const prev = msgs[i - 1];
                const isConsecutive = prev && prev.sender === m.sender;
                const isMe = m.sender === 'customer';
                return (
                  <div key={m.id} className={`custom-chat-bubble ${isMe ? 'me' : 'them'}${isConsecutive ? ' consecutive' : ''}`}>
                    {!isMe && !isConsecutive && (
                      <div className="custom-chat-sender-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#127443', marginBottom: '0.2rem' }}>
                        {m.senderName ? (m.sender === 'driver' ? `🏍️ ${m.senderName}` : m.senderName) : (m.sender === 'driver' ? '🏍️ الكابتن' : '🏪 المتجر (الدعم)')}
                      </div>
                    )}
                    <div>{isVoiceMessage(m.text) ? <VoiceMessage url={getVoiceUrl(m.text)} /> : m.text}</div>
                    <div className="custom-chat-time">
                      {isMe && (
                        m._failed
                          ? <span title="فشل الإرسال" style={{ color: '#ef4444', fontSize: '0.65rem', marginLeft: '0.2rem' }}>⚠️</span>
                          : m.status === 'read'
                            ? <span title="مقروءة" style={{ color: '#34c759', fontSize: '0.65rem', marginLeft: '0.2rem' }}>✓✓</span>
                            : <span title="تم الإرسال" style={{ color: '#94a3b8', fontSize: '0.65rem', marginLeft: '0.2rem' }}>✓</span>
                      )}
                      {m.time}
                    </div>
                    {m._failed && (
                      <button onClick={() => retrySendMessage(m.id)} style={{ fontSize: '0.6rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        إعادة الإرسال
                      </button>
                    )}
                  </div>
                );
              })}
              {typingUsers[chatOrder] && (
                <div className="custom-chat-bubble them" style={{ opacity: 0.6 }}>
                  <div className="chat-typing-dots"><span>.</span><span>.</span><span>.</span></div>
                </div>
              )}
            </div>
            <div className="custom-chat-input">
              {audio.recording ? (
                <>
                  <span style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0 0.3rem', alignSelf: 'center' }}>{audio.formatTime(audio.recordingTime)}</span>
                  <button className="chat-mic-btn recording" onClick={async () => { const blob = await audio.stopRecording(); if (blob && blob.size > 1000) { try { const url = await audio.uploadAudio(blob, chatOrder); sendMessage('customer', makeVoiceText(url), chatOrder, null, null, customerProfile?.phone); } catch (e) { console.error('voice fail', e); } } }} title="إيقاف التسجيل" style={{ alignSelf: 'center' }}>⏹</button>
                </>
              ) : (
                <button className="chat-mic-btn" onClick={async () => { try { await audio.startRecording(); } catch (e) { if (e.message === 'permission_denied') alert('الرجاء السماح بتسجيل الصوت في إعدادات المتصفح'); } }} title="تسجيل رسالة صوتية" style={{ alignSelf: 'center' }}>🎤</button>
              )}
              <input type="text" value={chatText} onChange={e => { setChatText(e.target.value); sendTyping(chatOrder, null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { sendMessage('customer', chatText, chatOrder, null, null, customerProfile?.phone); setChatText(''); } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage('customer', chatText, chatOrder, null, null, customerProfile?.phone); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      {orders.map(order => {
        const isExpanded = expandedOrder === order.id;
        const statusInfo = STATUS_LABELS[order.status] || { text: order.status, icon: '' };
        const isNewOrder = order.status === 'جديد' && order.date && (Date.now() - new Date(order.date).getTime() < 2 * 60 * 1000);
        
        return (
          <div key={order.id} className={`order-card-mini ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedOrder(isExpanded ? null : order.id)} style={{ cursor: 'pointer' }}>
            <div className="order-card-mini-top">
              <div>
                <div className="order-card-mini-id">طلب #{order.id.slice(-6)}</div>
                <div className="order-card-mini-date">{order.date ? new Date(order.date).toLocaleDateString('ar-SA') + ' ' + new Date(order.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                {order.estimatedDelivery && (
                  <div className="order-eta" style={order.status !== 'في الطريق' ? { color: '#94a3b8', fontSize: '0.75rem' } : {}}>
                    {order.status === 'في الطريق' ? '🕐 ' : '⏱ '}التوصيل خلال {order.estimatedDelivery} دقيقة {order.status === 'في الطريق' ? `(≈ ${formatETA(order.estimatedDelivery)})` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                <span className={`order-badge ${order.status === 'جديد' ? 'badge-new' : order.status === 'قيد التحضير' ? 'badge-prep' : order.status === 'جاهز للتوصيل' ? 'badge-ready' : order.status === 'في الطريق' ? 'badge-route' : order.status === 'تم التوصيل' ? 'badge-route' : order.status === 'مكتمل' ? 'badge-done' : 'badge-cancel'}`}>
                  {order.status === 'جديد' && isNewOrder ? '📋 تم استلام طلبك' : statusInfo.text}
                </span>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>{order.total.toFixed(2)} ر.س</span>
              </div>
            </div>

            <div style={{ padding: '0.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {order.items?.slice(0, isExpanded ? order.items.length : 3).map(item => (
                  <span key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}>
                    {item.name} <strong style={{ color: '#e2e8f0' }}>×{item.qty}</strong>
                  </span>
                ))}
                {!isExpanded && order.items?.length > 3 && (
                  <span className="order-card-mini-more" style={{ alignSelf: 'center' }}>+{order.items.length - 3} أخرى</span>
                )}
              </div>
            </div>

            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                {order.paymentMethod && (
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    <strong>💳 الدفع:</strong> {order.paymentMethod}
                  </div>
                )}
                {order.deliveryAddress && (
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    <strong>📍 العنوان:</strong> {order.deliveryAddress}
                  </div>
                )}
                {(() => {
                  const coords = parseOrderLocation(order.location);
                  if (!coords) return null;
                  const links = getMapLinks(coords);
                  return (
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                      <strong>📍 موقع الاستلام:</strong>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem', direction: 'ltr', textAlign: 'left' }}>
                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                      </div>
                      <a href={links.googleDir} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: '0.3rem', color: '#22c55e', fontSize: '0.85rem', textDecoration: 'none', marginLeft: '0.75rem' }}>
                        🗺️ Google Maps
                      </a>
                      <a href={links.osmView} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#22c55e', fontSize: '0.85rem', textDecoration: 'none' }}>
                        🗺️ OpenStreetMap
                      </a>
                    </div>
                  );
                })()}
                {order.notes && (
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    <strong>📝 ملاحظات:</strong> {order.notes}
                  </div>
                )}
                {order.phone && (
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    <strong>📞 رقم الجوال:</strong> {order.phone}
                  </div>
                )}
                {order.status !== 'مكتمل' && order.status !== 'ملغي' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="order-chat-btn" onClick={e => { e.stopPropagation(); setChatOrder(order.id); }}>💬 محادثة الطلب</button>
                  </div>
                )}
              </div>
            )}

            {!isExpanded && (
              <div className="order-card-mini-total">
                {order.status !== 'مكتمل' && order.status !== 'ملغي' && (
                  <button className="order-chat-btn" onClick={e => { e.stopPropagation(); setChatOrder(order.id); }} style={{ marginRight: 'auto' }}>💬 محادثة</button>
                )}
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>اضغط لعرض التفاصيل ▾</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default OrdersTab;
