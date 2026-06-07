import { memo } from 'react';

const UpdateBanner = memo(() => {
  const apply = () => {
    window.location.reload();
  };
  return (
    <div className="update-banner">
      <span>يتوفر تحديث جديد</span>
      <button onClick={apply}>تحديث الآن</button>
    </div>
  );
});

export default UpdateBanner;
