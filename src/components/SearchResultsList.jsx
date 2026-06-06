import { memo } from 'react';
import { productImgError } from '../utils/constants';

const SearchResultsList = memo(({ results, addToCart, cart, searchQuery }) => {
  if (!searchQuery) return null;

  return (
    <div className="search-results-list">
      <div className="search-results-count">{results.length} نتيجة لـ "{searchQuery}"</div>
      {results.length === 0 && (
        <div className="search-results-empty">لا توجد منتجات تطابق بحثك</div>
      )}
      {results.map(product => {
        const cartItem = cart?.find(item => item.id === product.id);
        const cartQty = cartItem?.qty || 0;
        const outOfStock = product.stock_quantity === 0;
        return (
          <div key={product.id} className={`search-result-item ${outOfStock ? 'out-of-stock' : ''}`} style={{ gap: '1rem' }}>
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              onError={productImgError} 
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'cover',
                borderRadius: '8px',
                flexShrink: 0,
                background: 'rgba(0,0,0,0.05)'
              }}
              loading="lazy"
            />
            <div className="search-result-info">
              <div className="search-result-name">{product.name}</div>
              <div className="search-result-meta">
                <span className="search-result-category">{product.category}</span>
                {product.unit && <span className="search-result-unit">/{product.unit}</span>}
              </div>
              <div className="search-result-price-row">
                <span className="search-result-price">
                  {product.isOffer && product.offerPrice != null ? (
                    <><span className="offer-old">{product.price.toFixed(2)}</span> {product.offerPrice.toFixed(2)}</>
                  ) : product.price.toFixed(2)}
                  <span className="currency"> ر.س</span>
                </span>
                {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                  <span className="search-result-low-stock">بقية {product.stock_quantity}</span>
                )}
              </div>
            </div>
            <div className="search-result-action">
              {outOfStock ? (
                <span className="search-result-out-label">نفذ</span>
              ) : (
                <button
                  className="search-result-add-btn"
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                >
                  {cartQty > 0 && <span className="search-result-cart-qty">{cartQty}</span>}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span className="search-result-add-text">أضف لسلتك</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default SearchResultsList;
