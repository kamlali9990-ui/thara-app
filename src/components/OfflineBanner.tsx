import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setJustReconnected(false); };
    const goOnline = () => {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline && !justReconnected) return null;

  return (
    <div className={`offline-banner ${offline ? 'offline-banner-off' : 'offline-banner-on'}`}>
      {offline
        ? '⚠ أنت غير متصل بالإنترنت — بعض الخدمات قد لا تعمل'
        : '✓ تم استعادة الاتصال بالإنترنت'}
    </div>
  );
}
