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
      const aOut = (a.stock_quantity === 0) ? 1 : 0;
      const bOut = (b.stock_quantity === 0) ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
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

  const prevPage = useCallback(() => {
    setFade(false);
    setTimeout(() => { setPage(prev => (prev - 1 + totalPages) % totalPages); setFade(true); }, 200);
  }, [totalPages]);
  const nextPage = useCallback(() => {
    setFade(false);
    setTimeout(() => { setPage(prev => (prev + 1) % totalPages); setFade(true); }, 200);
  }, [totalPages]);

  return (
    <div className="rotating-cat-row" style={{ '--cat-color': categoryColor }}
      ref={gridRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {totalPages > 1 && (
        <div className="rotating-cat-nav">
          <button className="rotating-cat-arrow rotating-cat-arrow-right" onClick={nextPage} aria-label="التالي">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span className="rotating-cat-pages">{page + 1} / {totalPages}</span>
          <button className="rotating-cat-arrow rotating-cat-arrow-left" onClick={prevPage} aria-label="السابق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      )}
      <div className={`rotating-cat-grid ${fade ? 'fade-in' : 'fade-out'}`}>
        {visible.map(product => (
          <ProductCard key={`${page}-${product.id}`} product={product} addToCart={addToCart} cart={cart} />
        ))}
      </div>
    </div>
  );
});

export default RotatingCategoryRow;
