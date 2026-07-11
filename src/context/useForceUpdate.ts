import { useEffect, useRef } from 'react';
import { showToast } from '../components/Toast';

export function useForceUpdate() {
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReload = (reason: string) => {
    if (reloadTimerRef.current) return;
    showToast('🔄 يتوفر تحديث جديد، سيتم إعادة التحميل...', 'info');
    reloadTimerRef.current = setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_VERSION') {
        scheduleReload('إصدار جديد من التطبيق');
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    const handleControllerChange = () => {
      scheduleReload('تحديث خدمة التطبيق');
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const checkBuildId = async () => {
      try {
        const resp = await fetch(window.location.href, {
          cache: 'no-store', method: 'GET', headers: { 'X-Build-Check': '1' }
        });
        const html = await resp.text();
        const match = html.match(/<meta name="build-id" content="([^"]+)"/);
        const currentMatch = document.querySelector('meta[name="build-id"]');
        if (match && currentMatch && match[1] !== currentMatch.getAttribute('content')) {
          scheduleReload('تحديث المحتوى');
        }
      } catch {}
    };

    const interval = setInterval(checkBuildId, 60000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(interval);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);
}
