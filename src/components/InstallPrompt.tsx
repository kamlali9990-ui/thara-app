import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    __deferredPrompt?: any;
    MSStream?: any;
  }
}

const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;
const DURATIONS = [3, 7, 30, 365];

interface InstallPromptProps {
  variant?: string;
}

export default function InstallPrompt({ variant }: InstallPromptProps) {
  const BASE = import.meta.env.BASE_URL || '/';
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const permanentlyDismissed = localStorage.getItem('pwa-install-permanent-dismiss');

  if (isStandalone) return null;

  const dismissedCount = parseInt(localStorage.getItem('pwa-install-dismiss-count') || '0', 10);
  const dismissedTime = localStorage.getItem('pwa-install-prompt-dismissed');
  const idx = Math.min(dismissedCount, DURATIONS.length - 1);
  const isRecentlyDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < DURATIONS[idx] * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
      if (!isRecentlyDismissed && !permanentlyDismissed) {
        setShow(true);
      }
    };
    const showHandler = () => { setShow(true); };
    const cartHandler = () => {
      if (isRecentlyDismissed || permanentlyDismissed || show) return;
      if (!localStorage.getItem('pwa-install-cart-triggered')) {
        localStorage.setItem('pwa-install-cart-triggered', '1');
        setTimeout(() => setShow(true), 800);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('show-pwa-install-prompt', showHandler);
    window.addEventListener('cart-install-trigger', cartHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('show-pwa-install-prompt', showHandler);
      window.removeEventListener('cart-install-trigger', cartHandler);
    };
  }, [isRecentlyDismissed, permanentlyDismissed, show]);

  useEffect(() => {
    if (!show) { setProgress(100); return; }
    const start = Date.now();
    const dur = 3000;
    let frame: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / dur) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        dismiss();
      } else {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [show]);

  const install = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') { setShow(false); return; }
      } catch (err) { console.error('PWA install error:', err); }
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'أسواق ثراء الشرق ون',
          text: 'حمل تطبيق أسواق ثراء الشرق ون وتصفح أحدث العروض والمنتجات',
          url: window.location.origin + BASE
        });
      } catch (err: any) { if (err.name !== 'AbortError') console.error('Share error:', err); }
    }
  };

  const dismiss = (manual: boolean = false) => {
    if (manual) {
      const count = parseInt(localStorage.getItem('pwa-install-dismiss-count') || '0', 10) + 1;
      localStorage.setItem('pwa-install-dismiss-count', count.toString());
      localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
      if (count >= 3) localStorage.setItem('pwa-install-permanent-dismiss', '1');
    }
    setShow(false);
  };

  const canInstall = !!deferredPrompt;

  if (variant === 'admin') {
    if (localStorage.getItem('admin-install-banner-dismissed')) return null;
    return (
      <div className="admin-install-banner" style={{
        background: 'linear-gradient(90deg, #127443 0%, #1a9e5c 100%)',
        color: 'white', padding: '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', fontSize: '0.85rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <span style={{ fontSize: '1.2rem' }}>📲</span>
          <span>
            {isIOS
              ? <span>أضف لوحة التحكم للشاشة الرئيسية <a href="/install-guide.html" target="_blank" style={{color:'#fde68a',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>📖 شرح بالصور</a></span>
              : canInstall ? 'ثبّت التطبيق للوصول السريع' : 'افتح قائمة المتصفح ⋮ ← تثبيت التطبيق'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {!isIOS && canInstall && (
            <button onClick={install} style={{
              background: 'white', color: '#127443', border: 'none',
              padding: '0.35rem 1.2rem', borderRadius: '12px', fontWeight: 700,
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}>تثبيت</button>
          )}
          <button onClick={() => { localStorage.setItem('admin-install-banner-dismissed', '1'); window.location.reload(); }} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none',
            borderRadius: '50%', width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit',
            lineHeight: 1, padding: 0
          }} aria-label="إغلاق">✕</button>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="install-overlay" onClick={() => dismiss(true)}>
      <div className="install-card" onClick={e => e.stopPropagation()}>
        <div className="install-card-inner">
          <img src={`${BASE}newicon.jpg`} alt="" className="install-logo"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = `${BASE}logo222.jpg`; }} />
          <h2 className="install-title">تطبيق أسواق ثراء الشرق ون</h2>
          <p className="install-subtitle">توصيل طلبات السوبرماركت لباب بيتك في الخفجي</p>

          <div className="install-actions">
            {canInstall && !isIOS ? (
              <button className="install-main-btn" onClick={install}>📲 تثبيت التطبيق</button>
            ) : (
              <span className="install-ios-hint">
                📲 شارك ← إضافة للشاشة الرئيسية للايفون
              </span>
            )}
            {!canInstall && (
              <a href={`${BASE}thara-app.apk`} download className="install-apk-link">
                📦 تحميل تطبيق الاندرويد
              </a>
            )}
            {isIOS && (
              <a href="/install-guide.html" target="_blank" className="install-ios-guide-link">
                📖 شرح بالصور
              </a>
            )}
          </div>

          <button className="install-skip-btn" onClick={() => dismiss(true)}>
            متابعة عبر المتصفح
          </button>
        </div>
        <div className="install-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
