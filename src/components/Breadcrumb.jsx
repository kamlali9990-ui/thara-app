import { memo } from 'react';

const Breadcrumb = memo(({ items }) => {
  return (
    <nav className="breadcrumb" aria-label="مسار التنقل">
      {items.map((item, idx) => (
        <span key={idx} className="breadcrumb-item">
          {idx > 0 && <span className="breadcrumb-sep">←</span>}
          {item.onClick ? (
            <button className="breadcrumb-link" onClick={item.onClick}>{item.label}</button>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
});

export default Breadcrumb;
