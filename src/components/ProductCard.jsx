import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { productImgError } from '../utils/constants';
import { useStore } from '../context/StoreContext';

const ProductCard = memo(({ product, addToCart, cart }) => {
  const { updateCartQty, removeFromCart } = useStore();
  const [added, setAdded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
  const cartItem = cart?.find(item => item.id === product.id);
  const cartQty = cartItem?.qty || 0;
  const price = Number(product.price) || 0;
  const offerPrice = product.isOffer && product.offerPrice != null ? Number(product.offerPrice) : null;
  const activePrice = offerPrice ?? price;

  const handleAdd = (e) => {
    if (outOfStock) return;
    e?.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 600);
  };

  const openDetails = () => setShowDetails(true);
  const closeDetails = (e) => {
    e?.stopPropagation();
    setShowDetails(false);
  };
  const handleCardKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetails();
    }
  };

  return (
    <div
      className="product-card-new"
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
      aria-label={`عرض تفاصيل ${product.name}`}
    >
      <div className="product-card-new-img-wrap">
        {product.isOffer && <span className="product-badge-offer">%</span>}
        {outOfStock && <span className="product-badge-out">نفذ</span>}
        {lowStock && <span className="product-badge-low">بقية {product.stock_quantity}</span>}
        <img src={product.imageUrl} alt={product.name} className="product-card-new-img" loading="lazy"
          onError={productImgError} />
        {!outOfStock && (
          <div className="product-card-new-actions">
            {cartQty > 0 ? (
              <>
                <button className="product-card-new-qty-btn minus" onClick={(e) => { e.stopPropagation(); if (cartQty <= 1) { removeFromCart(product.id); } else { updateCartQty(product.id, -1); } }} aria-label="تقليل الكمية">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span className="product-card-cart-qty">{cartQty}</span>
                <button className="product-card-new-add" onClick={(e) => { e.stopPropagation(); addToCart(product); setAdded(true); setTimeout(() => setAdded(false), 600); }} aria-label={`إضافة ${product.name} إلى السلة`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </>
            ) : (
              <button className={`product-card-new-add ${added ? 'added' : ''}`} onClick={handleAdd} aria-label={`إضافة ${product.name} إلى السلة`}>
                {added ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="product-card-new-body">
        <div className="product-card-new-cat">{product.category}</div>
        <div className="product-card-new-name">{product.name}</div>
        <div className="product-card-new-price-row">
          <div className="product-card-new-price">
            {offerPrice != null ? (
              <><span className="offer-old">{price.toFixed(2)}</span> {offerPrice.toFixed(2)}</>
            ) : price.toFixed(2)}
            <span className="product-card-new-currency"> ر.س</span>
          </div>
          <div className="product-card-new-unit">{product.unit}</div>
        </div>
      </div>

      {showDetails && createPortal((
        <div className="product-detail-overlay" onClick={closeDetails}>
          <div className="product-detail-card" role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-detail-close" onClick={closeDetails} aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="product-detail-img-wrap">
              {product.isOffer && <span className="product-detail-offer">عرض</span>}
              {outOfStock && <span className="product-detail-stock out">نفذ</span>}
              {lowStock && <span className="product-detail-stock low">بقية {product.stock_quantity}</span>}
              <img src={product.imageUrl} alt={product.name} className="product-detail-img" onError={productImgError} />
            </div>
            <div className="product-detail-body">
              <div className="product-detail-category">{product.category}</div>
              <h3 className="product-detail-name">{product.name}</h3>
              <div className="product-detail-price-row">
                <div className="product-detail-price">
                  {offerPrice != null && <span className="product-detail-old-price">{price.toFixed(2)}</span>}
                  <span>{activePrice.toFixed(2)}</span>
                  <span className="product-detail-currency"> ر.س</span>
                </div>
                {product.unit && <span className="product-detail-unit">/{product.unit}</span>}
              </div>
              {!outOfStock ? (
                <button type="button" className={`product-detail-add ${added ? 'added' : ''}`} onClick={handleAdd}>
                  {added ? 'تمت الإضافة' : 'أضف للسلة'}
                  {cartQty > 0 && <span>{cartQty}</span>}
                </button>
              ) : (
                <div className="product-detail-out-label">هذا المنتج غير متوفر حالياً</div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
});

export default ProductCard;
