import { useEffect, useState } from 'react';

const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
const isEdge = /Edg/.test(navigator.userAgent);

const AddToHomeScreen = ({ isOpen, onClose }) => {
  const BASE = import.meta.env.BASE_URL || '/';
  const [deferredPrompt, setDeferredPrompt] = useState(window.__deferredPrompt || null);

  useEffect(() => {
    // Check if we already have a deferred prompt stored globally
    if (window.__deferredPrompt) {
      setDeferredPrompt(window.__deferredPrompt);
    }

    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          onClose();
        }
      } catch (err) {
        console.error('خطأ في التثبيت:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="install-overlay" onClick={onClose}>
      <div className="install-card" onClick={(e) => e.stopPropagation()}>
        <button className="install-close-btn" onClick={onClose} aria-label="إغلاق">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="install-card-inner">
          <div className="install-header-section">
            <img src={`${BASE}logo222.jpg`} alt="" className="install-logo"
              onError={(e) => { e.target.src = `${BASE}icon.png`; }} />
            <div className="install-app-info">
              <h2 className="install-title">إضافة ثراء الشرق للشاشة الرئيسية</h2>
              <p className="install-subtitle">
                {isIOS ? 'اتبع الخطوات التالية' : 'اضغط على الزر أدناه'}
              </p>
            </div>
          </div>

          {isIOS ? (
            // Show manual steps directly for iOS
            <div className="manual-install-guide">
              <div className="step">
                <span className="step-number">1</span>
                <span>اضغط على زر المشاركة في سفاري</span>
                <span className="step-icon">⬆️</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>اختر "إضافة للشاشة الرئيسية"</span>
                <span className="step-icon">➕</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>اضغط "إضافة" في الزاوية</span>
                <span className="step-icon">✅</span>
              </div>
            </div>
          ) : deferredPrompt ? (
            // Show install button for Chrome/Edge
            <button className="install-main-btn" onClick={handleInstall}>
              إضافة للشاشة الرئيسية
            </button>
          ) : (
            // Show manual steps for other browsers
            <div className="manual-install-guide">
              {isChrome || isEdge ? (
                <>
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>اضغط على قائمة المتصفح</span>
                    <span className="step-icon">⋮</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"</span>
                    <span className="step-icon">➕</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>اتبع التعليمات على الشاشة</span>
                    <span className="step-icon">✅</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>افتح قائمة المتصفح</span>
                    <span className="step-icon">⋮</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>ابحث عن خيار "إضافة للشاشة الرئيسية"</span>
                    <span className="step-icon">➕</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>اتبع التعليمات</span>
                    <span className="step-icon">✅</span>
                  </div>
                </>
              )}
            </div>
          )}

          <button className="install-skip-btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreen;
