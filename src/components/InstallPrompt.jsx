import { useState, useEffect, useRef } from 'react';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [resolved, setResolved] = useState(false);
  const timerRef = useRef(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone) return;
    if (localStorage.getItem('thara_install_dismissed')) return;

    const captured = window.__deferredPrompt;
    if (captured) {
      setDeferredPrompt(captured);
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
      if (!resolved) { setShow(true); setResolved(true); }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    window.addEventListener('beforeinstallprompt', handler);

    timerRef.current = setTimeout(() => {
      setShow(true);
      setResolved(true);
    }, 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('thara_install_dismissed', '1');
  };

  const install = async () => {
    const prompt = deferredPrompt || window.__deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      window.__deferredPrompt = null;
      setDeferredPrompt(null);
      if (result.outcome === 'accepted') { setShow(false); return; }
    }
    dismiss();
  };

  if (!show) return null;

  const hasPrompt = !!(deferredPrompt || window.__deferredPrompt);

  if (variant === 'admin') {
    return (
      <div style={{
        background: '#127443', color: 'white', padding: '0.6rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '0.5rem', fontSize: '0.8rem'
      }}>
        <span style={{ lineHeight: 1.4 }}>
          {isIOS
            ? '📲 أضف للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)'
            : hasPrompt
              ? '📲 ثبّت التطبيق للوصول السريع'
              : '📲 افتح ⋮ ← تثبيت التطبيق'}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {!isIOS && hasPrompt && (
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
    );
  }

  return (
    <div className="install-overlay">
      <div className="install-card">
        <div className="install-card-inner">
          <img src="/thara-app/icon-192.png" alt="" className="install-logo" />
          <h2 className="install-title">أسواق ثرا الشرق ون</h2>
          <p className="install-subtitle">توصيل لباب بيتك في الخفجي</p>

          <div className="install-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <span>تصفح أسرع وأداء أفضل</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span>تنبيهات فورية بحالة الطلب</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <span>سهولة الوصول من الشاشة الرئيسية</span>
            </div>
          </div>

          <div className="install-instructions">
            {isIOS ? (
              <div className="ios-instructions">
                <p>للتثبيت على iPhone/iPad:</p>
                <ol>
                  <li>اضغط على زر المشاركة <span className="share-icon">⎋</span> أسفل الشاشة</li>
                  <li>اختر <strong>"إضافة للشاشة الرئيسية"</strong></li>
                </ol>
              </div>
            ) : !hasPrompt ? (
              <p>يفضل استخدام متصفح Chrome أو Samsung Internet لعرض زر التثبيت</p>
            ) : (
              <p>ثبّت التطبيق الآن على جهازك للوصول السريع والتصفح بدون إنترنت</p>
            )}
          </div>

          <div className="install-footer">
            {hasPrompt && !isIOS && (
              <button className="install-main-btn" onClick={install}>تثبيت التطبيق الآن</button>
            )}
            <button className="install-skip-btn" onClick={dismiss}>المتابعة عبر المتصفح</button>
          </div>
        </div>
      </div>
    </div>
  );
}
