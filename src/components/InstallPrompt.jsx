import { useState, useEffect, useRef } from 'react';

const DISMISSED_KEY = 'thara_install_dismissed';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ready, setReady] = useState(false);
  const timer = useRef(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone || localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setReady(true);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener('beforeinstallprompt', handler);

    timer.current = setTimeout(() => setReady(true), 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!ready) return null;

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (result.outcome === 'accepted') return;
    }
    dismiss();
  };

  const dismiss = () => {
    setReady(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const content = variant === 'admin' ? (
    <div style={{
      background: '#127443', color: 'white', padding: '0.6rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '0.5rem', fontSize: '0.8rem'
    }}>
      <span style={{ lineHeight: 1.4 }}>
        {isIOS
          ? '📲 أضف هذه الصفحة للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)'
          : '📲 ثبّت التطبيق للوصول السريع'}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        {!isIOS && deferredPrompt && (
          <button onClick={install} style={{
            background: 'white', color: '#127443', border: 'none',
            padding: '0.3rem 1rem', borderRadius: 99, fontWeight: 700,
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
          }}>تثبيت</button>
        )}
        <button onClick={dismiss} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none',
          fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.3rem'
        }}>✕</button>
      </div>
    </div>
  ) : (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div>
          <div className="install-prompt-title">ثبّت تطبيق ثرا الشرق ون</div>
          <div className="install-prompt-desc">
            {isIOS
              ? 'اضغط 🚀 في Safari ثم "إضافة للشاشة الرئيسية"'
              : deferredPrompt
                ? 'للوصول السريع والتصفح بدون إنترنت'
                : 'افتح القائمة ⋮ في Chrome ← تثبيت التطبيق'}
          </div>
        </div>
        <div className="install-prompt-actions">
          <button className="install-prompt-btn" onClick={install}>
            {deferredPrompt ? 'تثبيت' : 'حسناً'}
          </button>
          <button className="install-prompt-later" onClick={dismiss}>لا الآن</button>
        </div>
      </div>
    </div>
  );

  return content;
}
