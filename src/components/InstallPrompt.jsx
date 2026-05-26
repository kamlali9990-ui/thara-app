import { useState, useEffect } from 'react';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);
  const [show, setShow] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone) return;

    if (window.__deferredPrompt) {
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (!window.__deferredPrompt) setShow(true);
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    const prompt = deferredPrompt || window.__deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      window.__deferredPrompt = null;
      setDeferredPrompt(null);
      if (result.outcome === 'accepted') { setShow(false); return; }
    }
    setShow(false);
  };

  if (!show) return null;

  const dismiss = () => setShow(false);

  const canInstall = !!(deferredPrompt || window.__deferredPrompt);

  const content = variant === 'admin' ? (
    <div style={{
      background: '#127443', color: 'white', padding: '0.6rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '0.5rem', fontSize: '0.8rem'
    }}>
      <span style={{ lineHeight: 1.4 }}>
        {isIOS
          ? '📲 أضف هذه الصفحة للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)'
          : canInstall
            ? '📲 ثبّت التطبيق للوصول السريع'
            : '📲 افتح القائمة ⋮ في Chrome ← تثبيت التطبيق'}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        {!isIOS && canInstall && (
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
    <div className="install-overlay">
      <div className="install-card">
        <div className="install-card-inner">
          <img src="/thara-app/LOGO.jpg" alt="Logo" className="install-logo" />
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
              <span className="benefit-icon">📦</span>
              <span>سهولة تتبع الطلبات</span>
            </div>
          </div>

          <div className="install-instructions">
            {isIOS ? (
              <div className="ios-instructions">
                <p>للتثبيت على iPhone:</p>
                <ol>
                  <li>اضغط على زر المشاركة <span className="share-icon">⎋</span> أسفل الشاشة</li>
                  <li>اختر <strong>"إضافة للشاشة الرئيسية"</strong></li>
                </ol>
              </div>
            ) : (
              <p>{canInstall ? 'ثبّت التطبيق الآن للحصول على أفضل تجربة تسوق' : 'افتح القائمة ⋮ في المتصفح ثم اختر "تثبيت التطبيق"'}</p>
            )}
          </div>

          <div className="install-footer">
            {canInstall && !isIOS && (
              <button className="install-main-btn" onClick={install}>تثبيت التطبيق الآن</button>
            )}
            <button className="install-skip-btn" onClick={dismiss}>المتابعة عبر المتصفح</button>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}
