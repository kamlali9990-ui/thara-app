import { useState, useEffect, useRef } from 'react';

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;

export default function InstallPrompt({ variant }) {
  const BASE = import.meta.env.BASE_URL || '/';
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const dismissedTime = localStorage.getItem('pwa-install-prompt-dismissed');
  const isRecentlyDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < DISMISS_DURATION_MS);

  useEffect(() => {
    if (isStandalone) return;

    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
      if (!isRecentlyDismissed) {
        setShow(true);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    const showHandler = () => {
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('show-pwa-install-prompt', showHandler);

    // Auto-show after 3s only if a method to install is available
    if (!isRecentlyDismissed) {
      timerRef.current = setTimeout(() => {
        if (window.__deferredPrompt || isIOS) setShow(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('show-pwa-install-prompt', showHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isStandalone, isRecentlyDismissed]);

  const install = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShow(false);
          return;
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }
    // Fallback: Web Share if supported
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: 'ثراء الشرق ون', 
          text: 'حمل تطبيق ثراء الشرق ون وتصفح أحدث العروض والمنتجات', 
          url: window.location.origin + BASE
        });
      } catch (err) {
        console.log('Share canceled:', err);
      }
    }
  };

  const dismiss = () => {
    localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
    setShow(false);
  };

  const canInstall = !!deferredPrompt;

  if (variant === 'admin') {
    return (
      <div className="admin-install-banner" style={{
        background: 'linear-gradient(90deg, #127443 0%, #1a9e5c 100%)', 
        color: 'white', 
        padding: '0.75rem 1.25rem',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '1rem', 
        fontSize: '0.85rem',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📲</span>
          <span>
            {isIOS
              ? 'أضف لوحة التحكم للشاشة الرئيسية (زر المشاركة ← إضافة للشاشة الرئيسية)'
              : canInstall
                ? 'ثبّت التطبيق للوصول السريع ومتابعة الطلبات بشكل أسرع'
                : 'افتح قائمة المتصفح ⋮ ← تثبيت التطبيق'}
          </span>
        </div>
        {!isIOS && canInstall && (
          <button onClick={install} style={{
            background: 'white', 
            color: '#127443', 
            border: 'none',
            padding: '0.35rem 1.2rem', 
            borderRadius: '12px', 
            fontWeight: 700,
            fontSize: '0.8rem', 
            cursor: 'pointer', 
            fontFamily: 'inherit',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            transition: 'transform 0.1s'
          }}>تثبيت</button>
        )}
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="install-overlay">
      <div className="install-card">
        <button className="install-close-btn" onClick={dismiss} aria-label="إغلاق">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="install-card-inner">
          <div className="install-header-section">
            <img src={`${BASE}LOGO.jpg`} alt="" className="install-logo"
              onError={(e) => { e.target.src = `${BASE}icon.png`; }} />
            <div className="install-app-info">
              <h2 className="install-title">تطبيق ثراء الشرق ون</h2>
              <p className="install-subtitle">توصيل طلبات السوبرماركت لباب بيتك في الخفجي</p>
            </div>
          </div>

          {canInstall && !isIOS && (
            <button className="install-main-btn" onClick={install}>اضغط هنا للتثبيت</button>
          )}

          {!canInstall && isIOS && (
            <div className="install-ios-hint">
              <span className="ios-hint-icon">📲</span>
              <span className="ios-hint-text">شارك ← إضافة للشاشة الرئيسية</span>
            </div>
          )}

          <button className="install-skip-btn" onClick={dismiss}>متابعة عبر المتصفح</button>
        </div>
      </div>
    </div>
  );
}
