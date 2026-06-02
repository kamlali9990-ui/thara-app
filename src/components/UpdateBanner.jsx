import { memo } from 'react';

const UpdateBanner = memo(() => {
  const apply = () => {
    const reg = window.__swRegistration;
    if (!reg || !reg.waiting) return;
    reg.waiting.addEventListener('statechange', (e) => {
      if (e.target.state === 'activated') {
        window.location.reload();
      }
    });
    reg.waiting.postMessage('SKIP_WAITING');
  };
  return (
    <div className="update-banner">
      <span>يتوفر تحديث جديد</span>
      <button onClick={apply}>تحديث الآن</button>
    </div>
  );
});

export default UpdateBanner;
