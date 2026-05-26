import { useState, useEffect, useRef } from 'react';

export default function InstallPrompt({ variant }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isStandalone) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    window.addEventListener('beforeinstallprompt', handler);

    timerRef.current = setTimeout(() => setShow(true), 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') return;
    }
    if (navigator.share) {
      navigator.share({ title: 'أسواق ثرا الشرق ون', url: window.location.href });
    }
  };

  const dismiss = () => setShow(false);

  const canInstall = !!deferredPrompt;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (variant === 'admin') {
    return (
      <div style={{
        background: '#127443', color: 'white', padding: '0.6rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '0.5rem', fontSize: '0.8rem'
      }}>
        <span>
          {isIOS
            ? '📲 أضف للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)'
            : canInstall
              ? '📲 ثبّت التطبيق للوصول السريع'
              : '📲 افتح ⋮ ← تثبيت التطبيق'}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {!isIOS && canInstall && (
            <button onClick={install} style={{
              background: 'white', color: '#127443', border: 'none',
              padding: '0.3rem 1rem', borderRadius: 99, fontWeight: 700,
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
            }}>تثبيت</button>
          )}
        </div>
      </div>
    );
  }

  if (!show) return null;

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

          {canInstall && !isIOS && (
            <button className="install-main-btn" onClick={install}>تثبيت التطبيق الآن</button>
          )}

          {!canInstall && isIOS && (
            <div className="ios-instructions">
              <p>للتثبيت على iPhone/iPad:</p>
              <ol>
                <li>اضغط على زر المشاركة <span className="share-icon">⎋</span> أسفل الشاشة</li>
                <li>اختر <strong>"إضافة للشاشة الرئيسية"</strong></li>
              </ol>
            </div>
          )}

          {!canInstall && !isIOS && (
            <p className="install-instructions">افتح قائمة المتصفح ⋮ ← تثبيت التطبيق</p>
          )}

          <button className="install-skip-btn" onClick={dismiss}>متابعة عبر المتصفح</button>
        </div>
      </div>
    </div>
  );
}
