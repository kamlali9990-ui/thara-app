import { memo } from 'react';

export const SkeletonBlock = memo(({ width, height, radius }) => (
  <div className="skeleton-block" style={{
    width: width || '100%',
    height: height || '20px',
    borderRadius: radius || '12px',
    background: 'var(--skeleton-bg, #e2e8f0)',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite'
  }} />
));

export const SkeletonProductCard = memo(() => (
  <div className="skeleton-product-card">
    <SkeletonBlock height="120px" radius="14px" />
    <div style={{ padding: '8px 10px' }}>
      <SkeletonBlock height="12px" width="70%" />
      <div style={{ height: 6 }} />
      <SkeletonBlock height="10px" width="50%" />
      <div style={{ height: 4 }} />
      <SkeletonBlock height="16px" width="40%" />
    </div>
  </div>
));

export const SkeletonCategoryTicker = memo(() => (
  <div className="skeleton-ticker">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton-ticker-item">
        <SkeletonBlock width="38px" height="38px" radius="50%" />
        <SkeletonBlock width="50px" height="12px" />
      </div>
    ))}
  </div>
));
