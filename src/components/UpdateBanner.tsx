import { useState, useEffect, memo } from 'react';

const UPDATE_BANNER_DISMISSED = 'thara-update-banner-dismissed';

declare global {
  interface Window {
    __swRegistration?: ServiceWorkerRegistration;
  }
}

const UpdateBanner = memo(() => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(UPDATE_BANNER_DISMISSED)) return;
    const handler = () => setVisible(true);
    window.addEventListener('sw-update', handler);
    return () => window.removeEventListener('sw-update', handler);
  }, []);

  const apply = () => {
    const reg = window.__swRegistration;
    if (reg && reg.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    }
    window.location.reload();
  };

  const dismiss = () => {
    localStorage.setItem(UPDATE_BANNER_DISMISSED, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="update-banner">
      <span>يتوفر تحديث جديد. يرجى التحديث للحصول على آخر الإصدارات</span>
      <button onClick={apply}>تحديث الآن</button>
      <button className="update-banner-dismiss" onClick={dismiss} aria-label="إغلاق">✕</button>
    </div>
  );
});

export default UpdateBanner;
