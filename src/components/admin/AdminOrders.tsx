import React, { useContext, useState, useRef, useEffect } from 'react';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../../hooks/useAudioRecorder';
import VoiceMessage from '../../components/VoiceMessage';
import { StoreContext } from '../../context/StoreContext';
import OrderLocationMap from '../OrderLocationMap';
import { parseOrderLocation, getMapLinks } from '../../utils/location';
import { showToast } from '../Toast';
import { printInvoice } from '../../utils/printInvoice';
import type { Order, ChatMessage, Customer, StaffMember } from '../../types';

const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];
const ORDERS_PAGE_SIZE = 50;

export default function AdminOrders({ orders, updateOrderStatus, staffRole, currentStaff, isDriver, drivers, assignDriverToOrder, claimOrder, allCustomers = [], staffList = [] }: {
  orders: Order[];
  updateOrderStatus: (id: string, status: string, eta?: number) => void;
  staffRole: string;
  currentStaff: any;
  isDriver: boolean;
  drivers: any[];
  assignDriverToOrder: (orderId: string, driverId: number | null) => Promise<void>;
  claimOrder: (orderId: string) => Promise<void>;
  allCustomers?: Customer[];
  staffList?: StaffMember[];
}) {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, archiveOrder, restoreOrder, archivedOrders, loadArchivedOrders } = useContext(StoreContext);
  const [etaInputs, setEtaInputs] = useState<Record<string, string>>({});
  const [confirmMsg, setConfirmMsg] = useState<{ text: string; onConfirm: () => void } | null>(null);
  const [chatOrder, setChatOrder] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const audio = useAudioRecorder();
  const [showArchived, setShowArchived] = useState(false);
  const [activeDriverTab, setActiveDriverTab] = useState('available');
  const [etaModalOrder, setEtaModalOrder] = useState<Order | null>(null);
  const [activeVisible, setActiveVisible] = useState(ORDERS_PAGE_SIZE);
  const [completedVisible, setCompletedVisible] = useState(ORDERS_PAGE_SIZE);
  const [archivedVisible, setArchivedVisible] = useState(ORDERS_PAGE_SIZE);
  const [etaModalValue, setEtaModalValue] = useState('30');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    return new Date(dateStr).toLocaleDateString('ar-SA');
  };

  useEffect(() => {
    if (showArchived && archivedOrders.length === 0) loadArchivedOrders();
  }, [showArchived]);

  // Auto-mark order chat messages as read when modal opens
  useEffect(() => {
    if (!chatOrder) return;
    const unreadIds = chatMessages
      .filter((m: ChatMessage) => (!m.orderId || m.orderId === chatOrder) && m.sender === 'customer' && m.status !== 'read')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markMessagesAsRead(unreadIds);
    }
  }, [chatOrder]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatOrder, chatMessages]);

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

const handleStatusChange = (order: Order, newStatus: string) => {
  const ci = STATUS_ORDER.indexOf(order.status);
  const ni = STATUS_ORDER.indexOf(newStatus);
  if (newStatus !== 'ملغي' && ni < ci) {
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

  const doUpdate = (order: Order, newStatus: string) => {
    if (newStatus === 'في الطريق') {
      setEtaModalOrder(order);
      setEtaModalValue('30');
      return;
    }
    const eta = etaInputs[order.id];
    try {
      updateOrderStatus(order.id, newStatus, eta ? Number(eta) : undefined);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const confirmEtaModal = () => {
    const order = etaModalOrder;
    if (!order) return;
    const eta = etaModalValue;
    if (!eta || isNaN(Number(eta)) || Number(eta) <= 0) {
      showToast('الرجاء إدخال وقت توصيل صحيح', 'warning');
      return;
    }
    setEtaInputs(prev => ({ ...prev, [order.id]: eta }));
    updateOrderStatus(order.id, 'في الطريق', Number(eta));
    setEtaModalOrder(null);
  };

  const orderChatMessages = (orderId: string) => chatMessages.filter((m: ChatMessage) => !m.orderId || m.orderId === orderId);
  const senderRole = staffRole === 'driver' ? 'driver' : 'admin';

  const activeOrders = orders.filter(o => o.status !== 'مكتمل');
  const completedOrders = orders.filter(o => o.status === 'مكتمل');

  const getStatusClass = (status: string) => {
    if (status === 'جديد') return 'status-new';
    if (status === 'قيد التحضير') return 'status-preparing';
    if (status === 'جاهز للتوصيل') return 'status-ready';
    if (status === 'في الطريق') return 'status-route';
    if (status === 'تم التوصيل') return 'status-delivered';
    if (status === 'ملغي') return 'status-cancelled';
    if (status === 'مكتمل') return 'status-completed';
    return '';
  };

  const renderLocationBlock = (order: Order, { showMap = true, compact: mapCompact = false } = {}) => {
    const coords = parseOrderLocation(order.location);
    if (!coords) {
      return order.location ? <p className="order-location-missing">الموقع: {order.location}</p> : null;
    }
    const links = getMapLinks(coords);
    return (
      <div className={`order-location-block ${mapCompact ? 'order-location-compact' : ''}`}>
        {showMap && <OrderLocationMap lat={coords.lat} lng={coords.lng} />}
        <div className="admin-location-actions">
          <a href={links.googleDir} target="_blank" rel="noopener noreferrer" className="map-link map-link-google">
            📍 Google Maps
          </a>
          <a href={links.osmView} target="_blank" rel="noopener noreferrer" className="map-link map-link-osm">
            🗺️ OpenStreetMap
          </a>
        </div>
      </div>
    );
  };

  const renderDriverActions = (order: Order) => {
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
              } catch (err: any) {
                showToast('فشل قبول الطلب: ' + (err.message || 'خطأ غير معروف'), 'error');
              }
            }
          }}
          style={{ backgroundColor: 'var(--admin-accent)', color: 'var(--admin-accent-text)' }}
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
      return <span className="driver-status-done" style={{ color: 'var(--admin-warning)' }}>بانتظار تأكيد الإدارة</span>;
    }
    return <span className="driver-status-done">مكتمل</span>;
  };

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

  const renderOperatorActions = (order: Order) => {
    if (order.status === 'جديد') return (
      <button onClick={() => doUpdate(order, 'قيد التحضير')} className="btn btn-accept" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>استلام الطلب</button>
    );
    if (order.status === 'تم التوصيل') return (
      <button onClick={() => doUpdate(order, 'مكتمل')} className="btn btn-accept" style={{ background: 'var(--admin-success)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>✅ تأكيد التوصيل</button>
    );
    return (
      <select value={order.status} onChange={e => handleStatusChange(order, e.target.value)} className="order-status-select" style={{ padding: '0.25rem 0.4rem', fontSize: '0.8rem', maxWidth: '130px' }}>
        {['جديد','قيد التحضير','جاهز للتوصيل','في الطريق','تم التوصيل','مكتمل','ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  };

  const renderOrderCard = (order: Order, { compact = false } = {}) => {
    const isExpanded = compact ? false : expandedOrders.has(order.id);
    const meta = getStatusMeta(order.status);
    const uc = chatMessages.filter((m: ChatMessage) => m.orderId === order.id && m.sender === 'customer' && m.status !== 'read').length;
    const coords = parseOrderLocation(order.location);

    return (
      <div key={order.id} className={`admin-card order-card ${getStatusClass(order.status)} ${isExpanded ? 'order-card-expanded' : ''} ${compact ? 'order-card-compact-mode' : ''} ${isDriver ? 'is-driver-view' : ''}`}>
        {/* ===== COMPACT STRIP (always visible) ===== */}
          <div className={`order-compact ${isExpanded ? 'order-compact-open' : ''}`} onClick={() => { if (!compact) toggleExpand(order.id); }}>
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
          <div className="order-compact-right">
            <span className="order-compact-total">{order.total.toFixed(2)} <small>ر.س</small></span>
            {!compact && (
              <div className="order-compact-actions">
                <span className={`order-compact-expand ${isExpanded ? 'expanded' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===== EXPANDED CONTENT ===== */}
        {isExpanded && (
          <div className="order-expanded">
            {/* Status + ETA + Maps links strip */}
            <div className="order-expanded-strip">
              <div className="order-expanded-status-actions">
                {!isDriver ? renderOperatorActions(order) : renderDriverActions(order)}
              </div>
              {order.estimatedDelivery && (
                <span className="order-expanded-eta">🕐 {order.estimatedDelivery} د</span>
              )}
            </div>

            {/* Customer info mini block */}
            <div className="order-expanded-customer">
              <span className="order-expanded-label">العميل</span>
              {order.phone && (
                <span className="order-expanded-phone">
                  📞 {order.phone}
                  <a href={`tel:${order.phone}`} className="order-expanded-phone-link">اتصال</a>
                  <a href={`https://wa.me/${order.phone.replace(/^0/, '966')}`} target="_blank" rel="noopener noreferrer" className="order-expanded-phone-link">واتساب</a>
                </span>
              )}
              {order.deliveryAddress && <span className="order-expanded-addr">📍 {order.deliveryAddress}</span>}
              <span className="order-expanded-payment">💳 {order.paymentMethod === 'cod' ? 'كاش' : order.paymentMethod}</span>
            </div>

            {/* Items mini list */}
            <div className="order-expanded-items">
              <span className="order-expanded-label">المنتجات ({order.items?.length || 0})</span>
              <div className="order-expanded-items-list">
                {order.items?.map(item => (
                  <span key={item.id} className="order-expanded-item">{item.name} <span className="order-expanded-item-qty">×{item.qty}</span></span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {order.notes && <div className="order-expanded-notes">📝 {order.notes}</div>}

            {/* Map for all roles — important for driver */}
            {renderLocationBlock(order, { showMap: true, compact: true })}

            {/* Driver assignment */}
            {!isDriver && (staffRole === 'admin' || staffRole === 'manager') && (
              <div className="order-expanded-driver">
                <span className="order-expanded-label">🚚 الكابتن</span>
                <select value={order.assignedDriverId || ''} onChange={async e => {
                  try { await assignDriverToOrder(order.id, e.target.value ? Number(e.target.value) : null); showToast('تم التحديث', 'success'); }
                  catch (err: any) { showToast('فشل: ' + (err.message || ''), 'error'); }
                }} className="order-expanded-driver-select">
                  <option value="">-- غير معين --</option>
                  {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name || d.email}</option>)}
                </select>
                {order.assignedDriverId && (
                  <span className="order-expanded-driver-assigned">✓ {drivers.find((d: any) => String(d.id) === String(order.assignedDriverId))?.name || 'تم'}</span>
                )}
              </div>
            )}
            {isDriver && order.assignedDriverId && (
              <div className="order-expanded-driver-info">🏍️ {String(order.assignedDriverId) === String(currentStaff?.id) ? 'هذا طلبي' : `للكابتن ${drivers.find((d: any) => String(d.id) === String(order.assignedDriverId))?.name || ''}`}</div>
            )}

            {/* Map + Chat + Print in one row */}
            <div className="order-expanded-actions">
              {coords && (
                <a href={getMapLinks(coords).googleDir} target="_blank" rel="noopener noreferrer" className="chat-order-btn" title="فتح الخريطة">📍 خرائط</a>
              )}
              <div className="order-card-btn-wrap">
                {uc > 0 && <span className="order-card-unread-badge">{uc}</span>}
                <button type="button" className="chat-order-btn" onClick={() => setChatOrder(order.id)}>💬 محادثة</button>
              </div>
              <button type="button" className="chat-order-btn" onClick={() => printInvoice(order, { currentStaff, drivers, customers: allCustomers, staffList } as any)}>🖨️ طباعة</button>
              {staffRole === 'admin' && (
                <button type="button" className="admin-delete-btn" onClick={() => {
                  setConfirmMsg({
                    text: `أرشفة الطلب #${String(order.id).slice(-6)}؟`,
                    onConfirm: async () => { setConfirmMsg(null); try { await archiveOrder(order.id); showToast('تمت الأرشفة', 'success'); } catch (err) { showToast('فشل', 'error'); } }
                  });
                }}>📦 أرشفة</button>
              )}
            </div>
          </div>
        )}

        {compact && (
          <div className="order-compact-footer">
            <span>🕐 {new Date(order.date).toLocaleString('ar-SA')}</span>
            {order.notes && <span>📝 {order.notes.slice(0, 30)}{order.notes.length > 30 ? '…' : ''}</span>}
          </div>
        )}
      </div>
    );
  };

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
            <div className="order-chat-body" ref={chatBodyRef}>
              {orderChatMessages(chatOrder).length === 0 && <p className="empty-chat">لا توجد رسائل بعد.</p>}
              {orderChatMessages(chatOrder).map((m: ChatMessage, i: number) => {
                const msgs = orderChatMessages(chatOrder);
                const prev = msgs[i - 1];
                const isConsecutive = prev && prev.sender === m.sender;
                const isMe = m.sender === senderRole;
                const getSenderLabel = (msg: ChatMessage) => {
                  if (msg.sender === senderRole) return msg.senderName || 'أنت';
                  if (msg.sender === 'customer') return 'العميل';
                  if (msg.sender === 'driver') {
                    const o = orders.find(x => x.id === chatOrder);
                    const dName = msg.senderName || (o ? drivers.find((d: any) => String(d.id) === String(o.assignedDriverId))?.name : null);
                    return dName ? `الكابتن (${dName})` : 'الكابتن';
                  }
                  if (msg.sender === 'admin') {
                    return msg.senderName || 'المتجر / الدعم';
                  }
                  return msg.sender;
                };
                return (
                  <div key={m.id} className={`admin-bubble ${isMe ? 'admin' : 'customer'}${isConsecutive ? ' consecutive' : ''}`}>
                    {!isConsecutive && <div className="admin-bubble-sender">{getSenderLabel(m)}</div>}
                    <div>{isVoiceMessage(m.text) ? <VoiceMessage url={getVoiceUrl(m.text)} /> : m.text}</div>
                    <div className="admin-bubble-time">
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', marginRight: '0.2rem' }}>
                          {m._failed ? (
                            <button onClick={() => retrySendMessage(m.id)} style={{ color: 'var(--admin-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.65rem' }}>⚠️ إعادة</button>
                          ) : m.status === 'read' ? (
                            <span title="مقروءة" style={{ color: 'var(--admin-success)' }}>✓✓</span>
                          ) : (
                            <span title="تم الإرسال" style={{ color: 'var(--admin-text-muted)' }}>✓</span>
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
                  <div style={{ fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>يكتب...</div>
                </div>
              )}
            </div>
            <div className="order-chat-input">
              {audio.recording ? (
                <>
                  <span style={{ color: 'var(--admin-danger)', fontSize: '0.8rem', padding: '0 0.3rem', alignSelf: 'center' }}>{audio.formatTime(audio.recordingTime)}</span>
                  <button className="chat-mic-btn recording" onClick={async () => { const blob = await audio.stopRecording(); if (blob && blob.size > 1000) { try { const url = await audio.uploadAudio(blob, chatOrder); const o = orders.find(x => x.id === chatOrder); sendMessage(senderRole, makeVoiceText(url), chatOrder, null, currentStaff?.name, o?.phone); } catch (e) { console.error('voice fail', e); } } }} title="إيقاف التسجيل" style={{ alignSelf: 'center' }}>⏹</button>
                </>
              ) : (
                <button className="chat-mic-btn" onClick={async () => { try { await audio.startRecording(); } catch (e: any) { if (e.message === 'permission_denied') alert('الرجاء السماح بتسجيل الصوت في إعدادات المتصفح'); } }} title="تسجيل رسالة صوتية" style={{ alignSelf: 'center' }}>🎤</button>
              )}
              <input type="text" value={chatText} onChange={e => { setChatText(e.target.value); sendTyping(chatOrder, null); }}
                onKeyDown={e => { if (e.key === 'Enter') { if (chatText.trim()) { const o = orders.find(x => x.id === chatOrder); sendMessage(senderRole, chatText, chatOrder, null, currentStaff?.name, o?.phone); setChatText(''); } } }}
                placeholder="اكتب رسالة..." />
              <button className="chat-send-btn" onClick={() => { if (chatText.trim()) { const o = orders.find(x => x.id === chatOrder); sendMessage(senderRole, chatText, chatOrder, null, currentStaff?.name, o?.phone); setChatText(''); } }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {etaModalOrder && (
        <div className="confirm-overlay" onClick={() => setEtaModalOrder(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            <p style={{ marginBottom: '0.75rem', fontWeight: 700, color: 'var(--admin-text)', fontSize: '1rem' }}>⏱ وقت التوصيل المقدر</p>
            <p style={{ marginBottom: '1rem', color: 'var(--admin-text-soft)', fontSize: '0.85rem' }}>
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
                border: '0.5px solid var(--admin-border)',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontFamily: 'inherit',
                background: 'var(--admin-input-bg)',
                color: 'var(--admin-text)',
                outline: 'none',
                marginBottom: '1rem',
                boxSizing: 'border-box',
                textAlign: 'center',
                fontWeight: 800
              }}
            />
            <div className="confirm-actions">
              <button className="confirm-btn confirm-yes" onClick={confirmEtaModal} style={{ background: 'var(--admin-accent)', color: 'var(--admin-accent-text)', fontWeight: 800 }}>
                تأكيد وبدء التوصيل
              </button>
              <button className="confirm-btn confirm-no" onClick={() => setEtaModalOrder(null)} style={{ background: 'var(--admin-highlight-bg)', color: 'var(--admin-text)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="admin-section-title orders-title">{isDriver ? 'طلبات التوصيل' : 'إدارة الطلبات'}</h2>
      {isDriver ? (
        <div className="driver-stats-container">
          <div className={`driver-stat-card${activeDriverTab === 'available' ? ' active available' : ''}`} onClick={() => setActiveDriverTab('available')}>
            <span>
              متاحة {(stats.newOrders + stats.preparing) > 0 && <span className="bell-ring">🔔</span>}
            </span>
            <strong>{stats.newOrders + stats.preparing}</strong>
          </div>
          <div className={`driver-stat-card${activeDriverTab === 'assigned' ? ' active assigned' : ''}`} onClick={() => setActiveDriverTab('assigned')}>
            <span>مكلف بها</span>
            <strong>{stats.onRoute}</strong>
          </div>
          <div className={`driver-stat-card${activeDriverTab === 'completed' ? ' active completed' : ''}`} onClick={() => setActiveDriverTab('completed')}>
            <span>مكتملة</span>
            <strong>{stats.completed}</strong>
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
              <h3 className="driver-sub-title">📦 طلبات متوفرة ومتاحة للتوصيل ({orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).length})</h3>
              <div className="admin-orders-list">
                {orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).length === 0 ? (
                  <div className="empty-orders">لا توجد طلبات متوفرة للتوصيل حالياً.</div>
                ) : (
                  orders.filter(o => o.status !== 'مكتمل' && !o.assignedDriverId).map(order => renderOrderCard(order))
                )}
              </div>
            </>
          )}

          {activeDriverTab === 'assigned' && (
            <>
              <h3 className="driver-sub-title">🏍️ طلباتي المكلف بها حالياً ({orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).length})</h3>
              <div className="admin-orders-list">
                {orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).length === 0 ? (
                  <div className="empty-orders">لا توجد لديك طلبات جارية مكلف بها حالياً.</div>
                ) : (
                  orders.filter(o => o.status !== 'مكتمل' && o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff?.id)).map(order => renderOrderCard(order))
                )}
              </div>
            </>
          )}

          {activeDriverTab === 'completed' && (
            <>
              <h3 className="driver-sub-title">✅ أرشيف الطلبات المكتملة ({completedOrders.length})</h3>
              <div className="admin-orders-list completed-orders-list">
                {completedOrders.length === 0 ? (
                  <div className="empty-orders">لا توجد طلبات مكتملة.</div>
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
          {activeOrders.slice(0, activeVisible).map(order => renderOrderCard(order))}
          {activeOrders.length > activeVisible && (
            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              <button onClick={() => setActiveVisible(prev => prev + ORDERS_PAGE_SIZE)}
                className="load-more-btn">
                تحميل المزيد ({activeOrders.length - activeVisible} متبقي)
              </button>
            </div>
          )}
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
              {completedOrders.slice(0, completedVisible).map(order => renderOrderCard(order, { compact: true }))}
              {completedOrders.length > completedVisible && (
                <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                  <button onClick={() => setCompletedVisible(prev => prev + ORDERS_PAGE_SIZE)}
                    className="load-more-btn">
                    تحميل المزيد ({completedOrders.length - completedVisible} متبقي)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {staffRole === 'admin' && (
        <div className="completed-orders-section" style={{ marginTop: '0.75rem' }}>
          <button
            className="completed-toggle-btn archived-toggle-btn"
            onClick={() => setShowArchived(prev => !prev)}
          >
            {showArchived ? '▾' : '▸'} 📦 أرشيف الطلبات ({archivedOrders.length})
          </button>
          {showArchived && (
            <div className="admin-orders-list completed-orders-list">
              {archivedOrders.length === 0 ? (
                <div className="empty-orders empty-orders-text">لا توجد طلبات في الأرشيف.</div>
              ) : (
                <>
                  {archivedOrders.slice(0, archivedVisible).map((order: any) => (
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
                  ))}
                  {archivedOrders.length > archivedVisible && (
                    <button className="load-more-btn" style={{ margin: '0.75rem auto', display: 'block' }} onClick={() => setArchivedVisible(prev => prev + ORDERS_PAGE_SIZE)}>
                      تحميل المزيد ({archivedOrders.length - archivedVisible} متبقي)
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
