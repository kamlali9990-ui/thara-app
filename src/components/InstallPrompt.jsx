import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'thara_install_dismissed';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone || localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS) {
      if (localStorage.getItem('thara_ios_install_seen')) return;
      setShow(true);
      localStorage.setItem('thara_ios_install_seen', '1');
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  };

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (variant === 'admin') {
    return (
      <div style={{
        background: '#127443', color: 'white', padding: '0.6rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '0.5rem', fontSize: '0.8rem'
      }}>
        <span>📲 {isIOS ? 'أضف هذه الصفحة للشاشة الرئيسية لمشاهدة أفضل' : 'ثبّت التطبيق للوصول السريع'}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={install || dismiss} style={{
            background: 'white', color: '#127443', border: 'none',
            padding: '0.3rem 1rem', borderRadius: 99, fontWeight: 700,
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {isIOS ? 'كيف؟' : 'تثبيت'}
          </button>
          <button onClick={dismiss} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none',
            fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.3rem'
          }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div>
          <div className="install-prompt-title">ثبّت تطبيق ثرا الشرق ون</div>
          <div className="install-prompt-desc">
            {isIOS ? 'اضغط على زر المشاركة 🚀 ثم "إضافة للشاشة الرئيسية"' : 'للوصول السريع والتصفح بدون إنترنت'}
          </div>
        </div>
        <div className="install-prompt-actions">
          <button className="install-prompt-btn" onClick={install}>
            {isIOS ? 'شاهد الشرح' : 'تثبيت'}
          </button>
          <button className="install-prompt-later" onClick={dismiss}>لاحقاً</button>
        </div>
      </div>
    </div>
  );
}
