import { memo, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { WHATSAPP_NUM } from '../utils/constants';
import useAudioRecorder, { isVoiceMessage, getVoiceUrl, makeVoiceText } from '../hooks/useAudioRecorder';
import VoiceMessage from '../components/VoiceMessage';

const SupportChatWidget = memo(() => {
  const { chatMessages, sendMessage, sendTyping, typingUsers, markMessagesAsRead, retrySendMessage, user, customerProfile } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [lastOpenedSupport, setLastOpenedSupport] = useState(() => localStorage.getItem('thara_support_last_opened') || '');
  const chatBodyRef = useRef(null);
  const typingTimer = useRef(null);
  const audio = useAudioRecorder();

  const supportMessages = useMemo(() => {
    if (!user) return [];
    return chatMessages.filter(m => !m.orderId && (m.customerEmail === user.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)));
  }, [chatMessages, user, customerProfile]);

  const unreadCount = useMemo(() => {
    if (!user || isOpen) return 0;
    const adminMsgs = chatMessages.filter(m => !m.orderId && (m.customerEmail === user.email || (customerProfile?.phone && m.customerPhone === customerProfile.phone)) && m.sender === 'admin' && m.status !== 'read');
    if (!lastOpenedSupport) return adminMsgs.length;
    return adminMsgs.filter(m => {
      const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      const lastTime = new Date(lastOpenedSupport).getTime();
      return msgTime > lastTime;
    }).length;
  }, [chatMessages, user, customerProfile, lastOpenedSupport, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const nowStr = new Date().toISOString();
      localStorage.setItem('thara_support_last_opened', nowStr);
      setLastOpenedSupport(nowStr);
      const unreadIds = supportMessages.filter(m => m.sender === 'admin' && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0) markMessagesAsRead(unreadIds);
    }
  }, [isOpen, supportMessages]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [isOpen, supportMessages]);

  const handleSend = (voiceUrl) => {
    const msg = voiceUrl || inputText.trim();
    if (!msg) return;
    const finalText = voiceUrl ? makeVoiceText(voiceUrl) : msg;
    sendMessage('customer', finalText, null, null, null, customerProfile?.phone);
    setInputText('');
  };

  const handleVoiceRecord = async () => {
    if (audio.recording) {
      const blob = await audio.stopRecording();
      if (blob && blob.size > 1000) {
        try { const url = await audio.uploadAudio(blob, null); handleSend(url); }
        catch (e) { console.error('voice upload fail', e); }
      }
    } else {
      try { await audio.startRecording(); } catch (e) {
        if (e.message === 'permission_denied') alert('الرجاء السماح بتسجيل الصوت في إعدادات المتصفح');
      }
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTyping(null, user?.email);
  };

  const adminIsTyping = user && typingUsers[user.email] && supportMessages.length > 0;

  const StatusIcon = ({ status, failed }) => {
    if (failed) return <span title="فشل الإرسال" style={{ color: '#ef4444', fontSize: '0.65rem', marginRight: '0.2rem' }}>⚠️</span>;
    if (status === 'read') return <span title="مقروءة" style={{ color: '#34c759', fontSize: '0.65rem', marginRight: '0.2rem' }}>✓✓</span>;
    if (status === 'sent') return <span title="تم الإرسال" style={{ color: '#94a3b8', fontSize: '0.65rem', marginRight: '0.2rem' }}>✓</span>;
    return null;
  };

  const phone = WHATSAPP_NUM;
  const whatsappMsg = encodeURIComponent('السلام عليكم، أحتاج مساعدة بخصوص الطلب.');
  const whatsappUrl = `https://wa.me/${phone}?text=${whatsappMsg}`;

  return (
    <div className="chat-widgets-container" style={{
      position: 'fixed', bottom: '140px', right: '16px', zIndex: 300,
      display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'
    }}>
      <a
        className="chat-fab whatsapp-fab"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        title="تواصل عبر واتساب"
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)', color: 'white', transition: 'transform 0.2s',
          border: 'none', cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
          <path d="M19.11 17.38c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.7.3 1.25.48 1.68.62.7.22 1.33.2 1.83.12.56-.08 1.77-.72 2.02-1.43.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
          <path d="M16.03 3.2c-7.08 0-12.83 5.75-12.83 12.83 0 2.26.6 4.47 1.73 6.4L3 29l6.73-1.77a12.8 12.8 0 0 0 6.3 1.6h.01c7.08 0 12.83-5.75 12.83-12.83 0-3.43-1.33-6.65-3.76-9.08A12.75 12.75 0 0 0 16.03 3.2zm0 23.33h-.01c-1.93 0-3.82-.52-5.46-1.5l-.4-.24-3.99 1.05 1.07-3.9-.26-.4a10.48 10.48 0 0 1-1.61-5.55c0-5.8 4.72-10.52 10.53-10.52 2.8 0 5.43 1.1 7.41 3.08a10.45 10.45 0 0 1 3.08 7.43c0 5.8-4.73 10.52-10.53 10.52z"/>
        </svg>
      </a>

      <button
        className="chat-fab support-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="الدعم الفني المباشر"
        title="الدعم الفني المباشر"
        style={{
          width: '44px', height: '44px', borderRadius: '50%', border: 'none',
          background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(251, 191, 38, 0.35)', color: '#78350f', cursor: 'pointer',
          position: 'relative', transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '1.2rem' }}>💬</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            background: '#ff3b30', color: 'white', fontSize: '0.6rem', fontWeight: 800,
            width: '14px', height: '14px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)', border: '1.5px solid #fbbf24'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-win-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759', display: 'inline-block', animation: 'pulse-prep 1.5s infinite' }} />
              <span>الدعم الفني المباشر</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ fontSize: '1.1rem', color: '#94a3b8' }}>✕</button>
          </div>

          {!user ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', textAlign: 'center', gap: '1rem'
            }}>
              <span style={{ fontSize: '2.5rem' }}>🔒</span>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                تواصل مع الدعم الفني مباشرة وبخصوصية تامة! يرجى تسجيل الدخول للبدء.
              </p>
              <Link
                to="/login"
                className="acc-btn acc-btn-primary"
                onClick={() => setIsOpen(false)}
                style={{
                  textDecoration: 'none', display: 'inline-block', width: 'auto',
                  padding: '0.65rem 1.5rem', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem'
                }}
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <div ref={chatBodyRef} className="chat-win-body">
                {supportMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                    👋 أهلاً بك! اكتب رسالتك هنا وسيقوم فريق الدعم بالرد عليك في أقرب وقت.
                  </div>
                )}
                {supportMessages.map((m, i) => {
                  const prev = supportMessages[i - 1];
                  const isConsecutive = prev && prev.sender === m.sender;
                  return (
                  <div key={m.id} className={`chat-bubble ${m.sender === 'customer' ? 'me' : 'them'}${isConsecutive ? ' consecutive' : ''}`}>
                    <div>{isVoiceMessage(m.text) ? <VoiceMessage url={getVoiceUrl(m.text)} /> : m.text}</div>
                    <div className="chat-time">
                      {m.sender === 'customer' && <StatusIcon status={m.status} failed={m._failed} />}
                      {m.time}
                    </div>
                    {m._failed && (
                      <button
                        onClick={() => retrySendMessage(m.id)}
                        style={{ fontSize: '0.65rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        إعادة الإرسال
                      </button>
                    )}
                  </div>
                );})}
                {adminIsTyping && (
                  <div className="chat-bubble them" style={{ opacity: 0.6 }}>
                    <div className="chat-typing-dots"><span>.</span><span>.</span><span>.</span></div>
                  </div>
                )}
              </div>

              <div className="chat-win-input">
                {audio.recording ? (
                  <>
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0 0.3rem', alignSelf: 'center' }}>{audio.formatTime(audio.recordingTime)}</span>
                    <button className="chat-mic-btn recording" onClick={handleVoiceRecord} title="إيقاف التسجيل" style={{ alignSelf: 'center' }}>⏹</button>
                  </>
                ) : (
                  <button className="chat-mic-btn" onClick={handleVoiceRecord} title="تسجيل رسالة صوتية" style={{ alignSelf: 'center' }}>🎤</button>
                )}
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب استفسارك هنا..."
                />
                <button onClick={() => handleSend()}>إرسال</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default SupportChatWidget;
