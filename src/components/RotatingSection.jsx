import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';

const RotatingSection = memo(({ products, addToCart, setShowAllView, cart }) => {
  const { allProducts } = useStore();
  const [modeIndex, setModeIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const modeRef = useRef(modeIndex);
  modeRef.current = modeIndex;
  const modes = useMemo(() => [
    {
      id: 'offers',
      icon: '🔥',
      title: 'العروض المميزة اليومية',
      products: (allProducts || []).filter(p => p.isOffer),
    },
    {
      id: 'all',
      icon: '🥬',
      title: 'أكثر من 15000 صنف في مكان واحد',
      products: products,
    },
    {
      id: 'bestsellers',
      icon: '🏆',
      title: 'الأكثر مبيعا',
      products: products.slice(0, 6),
    },
  ], [allProducts, products]);

  useEffect(() => {
    const t = setInterval(() => {
      const mi = modeRef.current;
      const mode = modes[mi];
      const max = Math.max(0, Math.ceil(mode.products.length / 3) - 1);
      if (max === 0) {
        setModeIndex(i => (i + 1) % modes.length);
        setSubIndex(0);
      } else {
        setSubIndex(i => {
          const n = i + 1;
          return n > max ? 0 : n;
        });
      }
    }, 15000);
    return () => clearInterval(t);
  }, [modes]);

  const current = modes[modeIndex];
  const totalPages = Math.max(1, Math.ceil(current.products.length / 3));
  const safeSub = Math.min(subIndex, totalPages - 1);
  const pageItems = current.products.slice(safeSub * 3, safeSub * 3 + 3);
  const pageCount = Math.min(3, pageItems.length);
  const switchMode = (i) => { setModeIndex(i); setSubIndex(0); };
  const cycleMode = (e) => { e.stopPropagation(); switchMode((modeIndex + 1) % modes.length); };

  return (
    <div className="home-section-card rotating-section-card">
      <div className="section-card-header" onClick={cycleMode}>
        <div className="section-card-title-group">
          <span className="section-card-icon">{current.icon}</span>
          <h3 className="section-card-title">{current.title}</h3>
        </div>
        <span className="section-card-action-link" onClick={(e) => { e.stopPropagation(); setShowAllView(current.id); }}>عرض الكل</span>
      </div>
      <div className="categories-grid-new" style={{ gridTemplateColumns: `repeat(${pageCount || 3}, 1fr)` }} onClick={(e) => { if (e.target === e.currentTarget) cycleMode(e); }}>
        {pageItems.map((product, i) => (
          <ProductCard key={`${current.id}-${product.id}-${i}`} product={product} addToCart={addToCart} cart={cart} />
        ))}
        {pageItems.length === 0 && (
          <div className="no-products-card" style={{ gridColumn: '1 / -1', padding: '1rem' }}>
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>
      <div className="rotating-dots">
        {modes.map((_, i) => (
          <span key={i} className={`rotating-dot ${modeIndex === i ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); switchMode(i); }} />
        ))}
      </div>
    </div>
  );
});

export default RotatingSection;
