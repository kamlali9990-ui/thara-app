import { memo } from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = memo<BreadcrumbProps>(({ items }) => {
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
