import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { StoreContext } from '../../context/StoreContext';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../../hooks/useAudioRecorder';
import VoiceMessage from '../../components/VoiceMessage';
import type { ChatMessage, Customer } from '../../types';

interface ThreadInfo {
  key: string;
  label: string;
  email: string | null;
  phone: string | null;
  orderId: string | null;
  lastMsg: any;
  unread: number;
  messages: ChatMessage[];
}

export default function AdminChat({ chatMessages, sendMessage, allCustomers }: {
  chatMessages: ChatMessage[];
  sendMessage: (sender: string, text: string, orderId: string | null, email: string | null, senderName: string | null, phone: string | null) => void;
  allCustomers: Customer[];
}) {
  const { sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, currentStaff, staffRole, orders } = useContext(StoreContext);
  const [text, setText] = useState('');
  const audio = useAudioRecorder();
  const [activeThread, setActiveThread] = useState<ThreadInfo | null>(null);
  const [chatTab, setChatTab] = useState('support');
  const [searchThread, setSearchThread] = useState('');
  const [mobileView, setMobileView] = useState('threads');
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const { supportThreads, orderThreads } = useMemo(() => {
    const support: Record<string, ChatMessage[]> = {}, order: Record<string, ChatMessage[]> = {};
    chatMessages.forEach((m: ChatMessage) => {
      if (m.orderId) {
        const key = `order_${m.orderId}`;
        if (!order[key]) order[key] = [];
        order[key].push(m);
      } else if (m.customerEmail && allCustomers.some(c => c.email === m.customerEmail)) {
        const key = m.customerPhone || m.customerEmail;
        if (!support[key]) support[key] = [];
        support[key].push(m);
      }
    });
    return { supportThreads: support, orderThreads: order };
  }, [chatMessages, allCustomers]);

  const toThreadList = (threads: Record<string, ChatMessage[]>): ThreadInfo[] => Object.entries(threads)
    .map(([key, msgs]) => {
      const first = msgs[0];
      const customer = first ? allCustomers.find(c => c.email === first.customerEmail) : null;
      return {
        key,
        label: key.startsWith('order_') ? `طلب #${key.replace('order_', '').slice(-6)}` : (customer?.phone || key),
        email: key.startsWith('order_') ? null : (first?.customerEmail || null),
        phone: key.startsWith('order_') ? null : (customer?.phone || first?.customerPhone || null),
        orderId: key.startsWith('order_') ? key.replace('order_', '') : null,
        lastMsg: msgs[msgs.length - 1],
        unread: msgs.filter(m => m.sender === 'customer' && m.status !== 'read').length,
        messages: msgs
      };
    })
    .sort((a, b) => (b.lastMsg.timestamp || 0) > (a.lastMsg.timestamp || 0) ? 1 : -1);

  const isDriver = staffRole === 'driver';
  const driverOrderIds = useMemo(() => {
    if (!isDriver || !currentStaff) return new Set<string>();
    return new Set(orders.filter((o: any) => o.assignedDriverId && String(o.assignedDriverId) === String(currentStaff.id)).map((o: any) => o.id));
  }, [isDriver, orders, currentStaff]);

  const threads = useMemo(() => {
    const raw = chatTab === 'support' ? supportThreads : orderThreads;
    let list = toThreadList(raw);
    if (isDriver) {
      list = list.filter(t => t.orderId && driverOrderIds.has(t.orderId));
    }
    if (searchThread.trim()) {
      const q = searchThread.toLowerCase();
      list = list.filter(t => t.label.toLowerCase().includes(q));
    }
    return list;
  }, [chatTab, supportThreads, orderThreads, searchThread, isDriver, driverOrderIds]);

  const activeMessages = useMemo(() => {
    if (!activeThread) return [];
    const raw = activeThread.key.startsWith('order_') ? orderThreads : supportThreads;
    return raw[activeThread.key] || [];
  }, [activeThread, supportThreads, orderThreads]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeMessages]);

  useEffect(() => {
    if (!activeThread) return;
    const unreadIds = activeMessages.filter((m: ChatMessage) => m.sender === 'customer' && m.status !== 'read').map(m => m.id);
    if (unreadIds.length > 0) (markMessagesAsRead as any)(unreadIds);
  }, [activeThread, activeMessages, markMessagesAsRead]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMobileView('threads');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleThreadClick = (t: ThreadInfo) => {
    setActiveThread(t);
    if (window.innerWidth <= 768) setMobileView('chat');
  };

  const handleBackToThreads = () => {
    setActiveThread(null);
    setMobileView('threads');
  };

  const handleSend = (voiceUrl?: string) => {
    const msg = voiceUrl || text.trim();
    if (!msg || !activeThread) return;
    const finalText = voiceUrl ? makeVoiceText(voiceUrl) : msg;
    if (activeThread.orderId) {
      sendMessage('admin', finalText, activeThread.orderId, null, currentStaff?.name ?? null, activeThread.phone);
    } else if (activeThread.email) {
      sendMessage('admin', finalText, null, activeThread.email, currentStaff?.name ?? null, activeThread.phone);
    }
    setText('');
  };

  const handleVoiceRecord = async () => {
    if (audio.recording) {
      const blob = await audio.stopRecording();
      if (blob && blob.size > 1000 && activeThread) {
        try {
          const url = await audio.uploadAudio(blob, activeThread.orderId ?? undefined);
          handleSend(url);
        } catch (e) { console.error('voice upload fail', e); }
      }
    } else {
      try { await audio.startRecording(); } catch (e: any) {
        if (e.message === 'permission_denied') alert('الرجاء السماح بتسجيل الصوت في إعدادات المتصفح');
      }
    }
  };

  const customer = activeThread?.email ? allCustomers.find(c => c.email === activeThread.email) : null;

  return (
    <div className="admin-chat-container">
      <h2 className="admin-section-title chat-title">
        {chatTab === 'support' ? 'خدمة العملاء — محادثات دعم' : 'محادثات الطلبات'}
      </h2>

      <div className={`admin-chat-inner${mobileView === 'chat' && window.innerWidth <= 768 ? ' mobile-chat-active' : ''}${mobileView === 'threads' && window.innerWidth <= 768 ? ' mobile-threads-active' : ''}`}>
        {/* Left: Threads */}
        <div className={`admin-chat-threads${mobileView === 'chat' && window.innerWidth <= 768 ? ' mobile-hidden' : ''}`}>
          <div className="admin-chat-threads-header">
            <div className="admin-chat-tabs">
              {!isDriver && (
                <button className={`admin-chat-tab ${chatTab === 'support' ? 'active' : ''}`} onClick={() => { setChatTab('support'); setActiveThread(null); setMobileView('threads'); }}>
                  الدعم {Object.keys(supportThreads).length > 0 && `(${Object.keys(supportThreads).length})`}
                </button>
              )}
              <button className={`admin-chat-tab ${chatTab === 'orders' ? 'active' : ''}`} onClick={() => { setChatTab('orders'); setActiveThread(null); setMobileView('threads'); }}>
                الطلبات {isDriver ? '' : Object.keys(orderThreads).length > 0 && `(${Object.keys(orderThreads).length})`}
              </button>
            </div>
            <div className="admin-chat-search-wrap">
              <input type="text" className="admin-chat-search" placeholder="بحث..." value={searchThread} onChange={e => setSearchThread(e.target.value)} />
              {searchThread && <button className="admin-chat-search-clear" onClick={() => setSearchThread('')}>✕</button>}
            </div>
          </div>
          <div className="admin-chat-threads-list">
            {threads.length === 0 && (
              <div className="admin-chat-empty">لا توجد محادثات</div>
            )}
            {threads.map(t => (
              <div key={t.key} className={`admin-chat-thread-item ${activeThread?.key === t.key ? 'active' : ''} ${t.unread > 0 ? 'unread' : ''}`}
                onClick={() => handleThreadClick(t)}>
                <div className="admin-chat-thread-top">
                  <span className="admin-chat-thread-name">{t.label}</span>
                  <span className="admin-chat-thread-time">{t.lastMsg.time}</span>
                </div>
                <div className="admin-chat-thread-preview">
                  {t.lastMsg.sender === 'admin' && <span className="admin-chat-preview-label">أنت: </span>}
                  {t.lastMsg.text}
                </div>
                {t.unread > 0 && <span className="admin-chat-unread-badge">{t.unread}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Chat */}
        <div className={`admin-chat-main${mobileView === 'threads' && window.innerWidth <= 768 ? ' mobile-hidden' : ''}`}>
          {!activeThread ? (
            <div className="admin-chat-placeholder">
              <span className="admin-chat-placeholder-icon">💬</span>
              <p>اختر محادثة من القائمة</p>
            </div>
          ) : (
            <>
              <div className="admin-chat-main-header">
                <div>
                  <div className="admin-chat-main-title">{activeThread.label}</div>
                  {customer && (
                    <div className="admin-chat-main-sub">
                      {customer.name && <span>{customer.name} · </span>}
                      {customer.phone && <span dir="ltr">{customer.phone} · </span>}
                      {customer.loyalty_points != null && <span>نقاط: {customer.loyalty_points}</span>}
                    </div>
                  )}
                  {activeThread.orderId && (
                    <div className="admin-chat-main-sub">طلب رقم  #{activeThread.orderId.slice(-8)}</div>
                  )}
                </div>
                <button className="admin-chat-close-btn" onClick={handleBackToThreads}>
                  <span className="admin-chat-back-text">العودة</span>
                  <span className="admin-chat-close-x">✕</span>
                </button>
              </div>

              <div ref={chatBodyRef} className="admin-chat-body">
                {activeMessages.length === 0 && <p className="admin-chat-empty-msg">لا توجد رسائل بعد.</p>}
                {activeMessages.map((m: ChatMessage, i: number) => {
                  const prev = activeMessages[i - 1];
                  const isConsecutive = prev && prev.sender === m.sender;
                  return (
                  <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}${isConsecutive ? ' consecutive' : ''}`}>
                    {!isConsecutive && <div className="admin-bubble-sender">{m.sender === 'admin' ? (m.senderName || 'أنت') : (m.senderName || 'العميل')}</div>}
                    <div className="admin-bubble-text">{isVoiceMessage(m.text) ? <VoiceMessage url={getVoiceUrl(m.text ?? '') ?? ''} /> : m.text}</div>
                    <div className="admin-bubble-time">
                      {m.sender === 'admin' && (
                        <span className="admin-bubble-status">
                          {m._failed ? (
                            <button className="admin-bubble-retry" onClick={() => retrySendMessage(m.id)} title="إعادة الإرسال">⚠️</button>
                          ) : m.status === 'read' ? (
                            <span className="admin-bubble-read" title="مقروءة">✓✓</span>
                          ) : (
                            <span className="admin-bubble-sent" title="تم الإرسال">✓</span>
                          )}
                        </span>
                      )}
                      {m.time}
                    </div>
                  </div>
                );})}
                {activeThread && typingUsers[(activeThread.email || activeThread.orderId) ?? ''] && (
                  <div className="admin-bubble customer" style={{ opacity: 0.6 }}>
                    <div className="admin-bubble-sender">العميل</div>
                    <div className="admin-bubble-text" style={{ fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>يكتب...</div>
                  </div>
                )}
              </div>

              <div className="admin-chat-input-area">
                {audio.recording ? (
                  <>
                    <span style={{ color: 'var(--admin-danger)', fontSize: '0.8rem', padding: '0 0.3rem' }}>{audio.formatTime(audio.recordingTime)}</span>
                    <button className="admin-chat-mic-btn recording" onClick={handleVoiceRecord} title="إيقاف التسجيل">⏹</button>
                  </>
                ) : (
                  <button className={`admin-chat-mic-btn${audio.recording ? ' recording' : ''}`} onClick={handleVoiceRecord} title="تسجيل رسالة صوتية">🎤</button>
                )}
                <input type="text" value={text}
                  onChange={e => { setText(e.target.value); if (activeThread?.email) sendTyping(activeThread.orderId ?? '', activeThread.email); }}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب رسالتك..." className="admin-chat-input" />
                <button className="btn" onClick={() => handleSend()} disabled={!text.trim() && !audio.recording}>إرسال</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
