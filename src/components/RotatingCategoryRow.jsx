import { memo, useState, useMemo, useRef, useCallback } from 'react';
import ProductCard from './ProductCard';

const ITEMS_PER_PAGE = 10;

const RotatingCategoryRow = memo(({ category, categoryColor, allProducts, mostRequested, addToCart, cart, onViewAll }) => {
  const [page, setPage] = useState(0);
  const [fade, setFade] = useState(true);
  const gridRef = useRef(null);
  const touchX = useRef(0);

  const goTo = useCallback((i) => {
    setPage(i);
    setFade(true);
  }, []);

  const sorted = useMemo(() => {
    return [...allProducts].sort((a, b) => {
      const aCount = mostRequested[a.id] || 0;
      const bCount = mostRequested[b.id] || 0;
      if (bCount !== aCount) return bCount - aCount;
      return parseInt(a.id) - parseInt(b.id);
    });
  }, [allProducts, mostRequested]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  const visible = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const handleTouchStart = useCallback((e) => {
    touchX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) < 40) return;
    setFade(false);
    setTimeout(() => {
      if (dx > 0) {
        setPage(prev => (prev - 1 + totalPages) % totalPages);
      } else {
        setPage(prev => (prev + 1) % totalPages);
      }
      setFade(true);
    }, 200);
  }, [totalPages]);

  return (
    <div className="rotating-cat-row" style={{ '--cat-color': categoryColor }}
      ref={gridRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      <div className={`rotating-cat-grid ${fade ? 'fade-in' : 'fade-out'}`}>
        {visible.map(product => (
          <ProductCard key={`${page}-${product.id}`} product={product} addToCart={addToCart} cart={cart} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="rotating-cat-dots">
          {Array.from({ length: Math.min(totalPages, 20) }).map((_, i) => (
            <span key={i} className={`rotating-cat-dot ${i === page ? 'active' : ''}`}
              onClick={() => { goTo(i); }} />
          ))}
        </div>
      )}
    </div>
  );
});

export default RotatingCategoryRow;
