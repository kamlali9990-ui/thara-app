import { useState, useEffect, useCallback } from 'react';

function useBrowserCheck() {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return { isChrome, isEdge, isSafari, isFirefox, isIOS, isAndroid, isStandalone };
}

const STEPS = [
  {
    id: 'storage', label: 'التخزين المحلي',
    check: () => { try { localStorage.setItem('_diag','1'); localStorage.removeItem('_diag'); return true; } catch { return false; } },
    fix: () => { try { localStorage.clear(); return true; } catch { return false; } },
    chrome: 'مضمون — لا يحتاج إعدادات',
    safari: 'قد لا يعمل في التصفح الخاص — استخدم الوضع العادي',
    edge: 'قد تحجبه ميزة Tracking Prevention — عطّلها من edge://settings/privacy',
    pass: 'التخزين المحلي يعمل',
    fail: 'معطل — قد يكون بسبب التصفح الخاص أو إعدادات الخصوصية'
  },
  {
    id: 'notif', label: 'الإشعارات',
    check: () => Notification.permission === 'granted',
    fix: async () => { try { const p = await Notification.requestPermission(); return p === 'granted'; } catch { return false; } },
    chrome: 'اطلب الإذن مرة واحدة — اختر "استمرار"',
    safari: 'يجب تفعيلها من إعدادات الموقع',
    edge: 'قد تحتاج تعطيل "الهدوء" (Quiet Notifications)',
    pass: 'مفعلة ✅',
    fail: 'غير مفعلة — اضغط زر الإصلاح للسماح'
  },
  {
    id: 'location', label: 'تحديد الموقع',
    check: async () => { try { const p = await navigator.permissions.query({ name: 'geolocation' }); return p.state === 'granted'; } catch { return false; } },
    fix: async () => { try { await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 })); return true; } catch { return false; } },
    chrome: 'يطلب الإذن عند أول استخدام للخريطة',
    safari: 'قد يطلب الإذن بشكل منفصل',
    edge: 'مشابه لكروم',
    pass: 'مفعل ✅',
    fail: 'غير مفعل — اضغط زر الإصلاح للسماح'
  },
  {
    id: 'pwa', label: 'تثبيت التطبيق',
    check: () => window.matchMedia('(display-mode: standalone)').matches,
    fix: () => { window.dispatchEvent(new CustomEvent('show-pwa-install-prompt')); },
    chrome: 'افتح القائمة ⋮ ← تثبيت التطبيق',
    safari: 'مشاركة ← إضافة للشاشة الرئيسية',
    edge: 'افتح القائمة ⋯ ← تثبيت التطبيق',
    pass: 'مثبت ✅',
    fail: 'غير مثبت — زر الإصلاح سيحاول فتح نافذة التثبيت'
  },
  {
    id: 'sw', label: 'خدمة العامل (Service Worker)',
    check: async () => { try { const regs = await navigator.serviceWorker.getRegistrations(); return regs.length > 0; } catch { return false; } },
    fix: async () => { try { const reg = await navigator.serviceWorker.register((import.meta.env.BASE_URL || '/') + 'sw.js'); await navigator.serviceWorker.ready; return true; } catch { return false; } },
    chrome: 'يدعم بالكامل',
    safari: 'دعم محدود — قد لا يعمل في التصفح الخاص',
    edge: 'يدعم بالكامل',
    pass: 'مسجل ✅',
    fail: 'غير مسجل — اضغط زر الإصلاح لإعادة التسجيل'
  },
  {
    id: 'https', label: 'اتصال آمن (HTTPS)',
    check: () => window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    fix: null,
    chrome: 'يتطلب HTTPS للإشعارات و SW',
    safari: 'يتطلب HTTPS',
    edge: 'يتطلب HTTPS',
    pass: 'اتصال آمن ✅',
    fail: 'يستخدم HTTP — بعض الميزات لن تعمل'
  }
];

function StatusIcon({ pass }) {
  return (
    <span className={`diag-status-icon ${pass ? 'pass' : 'fail'}`}>
      {pass ? '✓' : '✗'}
    </span>
  );
}

export default function AdminDiagnostics() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(true);
  const [fixing, setFixing] = useState(null);
  const [, forceUpdate] = useState(0);
  const browser = useBrowserCheck();

  const runChecks = useCallback(async () => {
    setRunning(true);
    const r = {};
    for (const step of STEPS) {
      try { r[step.id] = await Promise.resolve(step.check()); } catch { r[step.id] = false; }
    }
    setResults(r);
    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const handleFix = async (step) => {
    if (!step.fix) return;
    setFixing(step.id);
    try {
      await Promise.resolve(step.fix());
      await new Promise(r => setTimeout(r, 500));
      const ok = await Promise.resolve(step.check());
      setResults(p => ({ ...p, [step.id]: ok }));
    } catch { setResults(p => ({ ...p, [step.id]: false })); }
    setFixing(null);
    forceUpdate(n => n + 1);
  };

  const browserName = browser.isChrome ? 'Chrome' : browser.isEdge ? 'Edge' : browser.isSafari ? 'Safari' : browser.isFirefox ? 'Firefox' : 'آخر';

  return (
    <div className="diag-container">
      <div className="diag-header">
        <h2>🔧 فحص المتصفح وإصلاح المشاكل</h2>
        <p>تأكد من أن متصفحك مهيأ لتجربة مثالية</p>
      </div>

      <div className="diag-browser-info">
        <span className="diag-browser-badge">{browserName}</span>
        {browser.isIOS && <span className="diag-browser-badge">iOS</span>}
        {browser.isAndroid && <span className="diag-browser-badge">Android</span>}
        {browser.isStandalone && <span className="diag-browser-badge installed">مثبت</span>}
      </div>

      {running ? (
        <div className="diag-loading">جاري الفحص...</div>
      ) : (
        <div className="diag-list">
          {STEPS.map(step => {
            const pass = results[step.id];
            return (
              <div key={step.id} className={`diag-item ${pass ? 'pass' : 'fail'}`}>
                <div className="diag-item-head">
                  <StatusIcon pass={pass} />
                  <span className="diag-item-label">{step.label}</span>
                  <div className="diag-item-status">
                    {pass ? '✅' : fixing === step.id ? '🔄' : '❌'}
                  </div>
                </div>
                <div className="diag-item-desc">{pass ? step.pass : step.fail}</div>
                {!pass && step.fix && (
                  <button className="diag-fix-btn" onClick={() => handleFix(step)} disabled={fixing === step.id}>
                    {fixing === step.id ? 'جاري الإصلاح...' : 'إصلاح'}
                  </button>
                )}
                <div className="diag-browser-tip">
                  💡 نصائح لـ {browserName}: {step[browser.isEdge ? 'edge' : browser.isSafari ? 'safari' : 'chrome']}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="diag-refresh-btn" onClick={runChecks} disabled={running}>
        {running ? 'جاري الفحص...' : '🔍 إعادة الفحص'}
      </button>

      <div className="diag-summary">
        <p>
          {Object.values(results).filter(Boolean).length} من {STEPS.length} تعمل بشكل صحيح
          {Object.values(results).filter(Boolean).length === STEPS.length ? ' 🎉' : ''}
        </p>
      </div>
    </div>
  );
}
