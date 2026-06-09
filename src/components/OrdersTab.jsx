import { memo, useContext, useEffect, useState } from 'react';
import { StoreContext } from '../context/StoreContext';

const OrdersTab = memo(({ orders, loadOrders }) => {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, customerProfile } = useContext(StoreContext);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [chatOrder, setChatOrder] = useState(null);
  const [chatText, setChatText] = useState('');

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
            <div className="custom-chat-body">
              {orderChatMsgs(chatOrder).length === 0 && <p className="custom-chat-empty">لا توجد رسائل بعد.</p>}
              {orderChatMsgs(chatOrder).map(m => {
                const isMe = m.sender === 'customer';
                return (
                  <div key={m.id} className={`custom-chat-bubble ${isMe ? 'me' : 'them'}`}>
                    {!isMe && (
                      <div className="custom-chat-sender-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#127443', marginBottom: '0.2rem' }}>
                        {m.senderName ? (m.sender === 'driver' ? `🏍️ ${m.senderName}` : m.senderName) : (m.sender === 'driver' ? '🏍️ الكابتن' : '🏪 المتجر (الدعم)')}
                      </div>
                    )}
                    <div>{m.text}</div>
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
              <input type="text" value={chatText} onChange={e => { setChatText(e.target.value); sendTyping(chatOrder, null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { sendMessage('customer', chatText, chatOrder, null, null, customerProfile?.phone); setChatText(''); } }}
                placeholder="اكتب رسالة..." />
              <button onClick={() => { if (chatText.trim()) { sendMessage('customer', chatText, chatOrder, null, null, customerProfile?.phone); setChatText(''); } }}>إرسال</button>
            </div>
          </div>
        </div>
      )}
      {orders.map(order => {
        return (
          <div key={order.id} className="order-card-mini">
            <div className="order-card-mini-top">
              <div>
                <div className="order-card-mini-id">طلب #{order.id.slice(-6)}</div>
                <div className="order-card-mini-date">{order.date ? new Date(order.date).toLocaleDateString('ar-SA') : ''}</div>
                {order.status === 'في الطريق' && order.estimatedDelivery && (
                  <div className="order-eta">🕐 وصول متوقع {formatETA(order.estimatedDelivery)}</div>
                )}
              </div>
              <span className={`order-badge ${order.status === 'جديد' ? 'badge-new' : order.status === 'قيد التحضير' ? 'badge-prep' : order.status === 'جاهز للتوصيل' ? 'badge-ready' : order.status === 'في الطريق' ? 'badge-route' : order.status === 'تم التوصيل' ? 'badge-route' : order.status === 'مكتمل' ? 'badge-done' : 'badge-cancel'}`}>
                {order.status === 'جديد' ? '🕐 بانتظار الاستلام'
                  : order.status === 'قيد التحضير'
                    ? (Date.now() - new Date(order.date).getTime() < 2 * 60 * 1000 ? '📋 تم استلام طلبك' : '👨‍🍳 يتم تجهيز طلبك')
                  : order.status === 'جاهز للتوصيل' ? '🏍️ طلبك جاهز - بانتظار الكابتن'
                  : order.status === 'في الطريق' ? '🚚 طلبك في الطريق'
                  : order.status === 'تم التوصيل' ? '✅ تم التوصيل - بانتظار التأكيد'
                  : order.status === 'مكتمل' ? '🎉 تم التوصيل بنجاح'
                  : order.status}
              </span>
            </div>
            <div className="order-card-mini-items">
              {order.items?.slice(0, 3).map(item => <span key={item.id}>{item.name} ×{item.qty}</span>)}
              {order.items?.length > 3 && <span className="order-card-mini-more">+{order.items.length - 3} أخرى</span>}
            </div>
            <div className="order-card-mini-total">
              <strong>{order.total.toFixed(2)} ر.س</strong>
              <button className="order-chat-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة</button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default OrdersTab;
