import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'thara_install_dismissed';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    setShow(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (result.outcome === 'accepted') setShow(false);
  };

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const content = variant === 'admin' ? (
    <div style={{
      background: '#127443', color: 'white', padding: '0.6rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '0.5rem', fontSize: '0.8rem'
    }}>
      <span style={{ lineHeight: 1.4 }}>
        {isIOS ? '📲 أضف هذه الصفحة للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)' : '📲 ثبّت التطبيق للوصول السريع'}
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
                : 'افتح في Chrome ← زر القائمة ← "تثبيت التطبيق"'}
          </div>
        </div>
        <div className="install-prompt-actions">
          {deferredPrompt ? (
            <button className="install-prompt-btn" onClick={install}>تثبيت</button>
          ) : (
            <button className="install-prompt-btn" onClick={dismiss}>حسناً</button>
          )}
          <button className="install-prompt-later" onClick={dismiss}>لاحقاً</button>
        </div>
      </div>
    </div>
  );

  return content;
}
