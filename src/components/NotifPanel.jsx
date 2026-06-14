import React, { memo, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';

const NotifPanel = memo(({ user, chatMessages, onClose, orders, onTabChange }) => {
  const { customerProfile } = useContext(StoreContext);
  let notifLastOpened = '';
  try { notifLastOpened = window.localStorage.getItem('thara_notif_last_opened') || ''; } catch {}
  const filteredMsgs = useMemo(() => {
    if (!user) return [];
    const lastTime = notifLastOpened ? new Date(notifLastOpened).getTime() : 0;
    return chatMessages.filter(m => (m.customerEmail === user.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)) && m.sender !== 'customer' && (!lastTime || (m.timestamp && new Date(m.timestamp).getTime() > lastTime)));
  }, [chatMessages, user, customerProfile, notifLastOpened]);
  const allDriverMsgs = useMemo(() => {
    if (!user) return [];
    return chatMessages.filter(m => (m.customerEmail === user.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)) && m.sender === 'driver');
  }, [chatMessages, user, customerProfile]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('thara_notif_last_opened', new Date().toISOString());
      window.dispatchEvent(new CustomEvent('thara:notif-updated'));
    } catch {}
  }, []);

  return (
    <>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-header">
          <h3>الإشعارات</h3>
          <button className="notif-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="notif-body">
          {!user ? (
            <div className="empty-tab">
              <h3>تسجيل الدخول</h3>
              <p>سجل دخولك لمشاهدة الإشعارات</p>
              <Link to="/login" className="btn">تسجيل الدخول</Link>
            </div>
          ) : filteredMsgs.length === 0 && allDriverMsgs.length === 0 ? (
            <div className="empty-tab">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <p>لا توجد إشعارات جديدة</p>
            </div>
          ) : (
            <>
              {filteredMsgs.map(m => (
                <div key={m.id} className="notif-item">
                  <div className="notif-item-icon">
                    {m.sender === 'driver' ? '🏍️' : '🏪'}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-sender">{m.senderName || (m.sender === 'driver' ? 'الكابتن' : 'المتجر')}</div>
                    <div className="notif-item-text">{m.text}</div>
                    <div className="notif-item-time">{m.time || ''}</div>
                  </div>
                </div>
              ))}
              {allDriverMsgs.length > 0 && (
                <div className="notif-section">
                  <div className="notif-section-title">رسائل الكباتن</div>
                  {orders.filter(o => o.status === 'في الطريق' || o.status === 'قيد التحضير').map(order => {
                    const driverMsgs = chatMessages.filter(m => m.orderId === order.id && m.sender === 'driver' && (m.customerEmail === user?.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)));
                    if (driverMsgs.length === 0) return null;
                    return (
                      <div key={order.id} className="notif-order-card" onClick={() => { onTabChange('orders'); onClose(); }}>
                        <div className="notif-order-id">طلب #{order.id.slice(-6)}</div>
                        {driverMsgs.slice(-2).map(m => (
                          <div key={m.id} className="notif-item" style={{ padding: '0.3rem 0' }}>
                            <div className="notif-item-icon" style={{ fontSize: '1rem' }}>🏍️</div>
                            <div className="notif-item-content">
                              <div className="notif-item-text">{m.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
});

export default NotifPanel;
