import { memo, useState } from 'react';
import { productImgError } from '../utils/constants';

const ProductCard = memo(({ product, addToCart, cart }) => {
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
  const cartItem = cart?.find(item => item.id === product.id);
  const cartQty = cartItem?.qty || 0;
  const handleAdd = (e) => { if (outOfStock) return; e?.stopPropagation(); addToCart(product); setAdded(true); setTimeout(() => setAdded(false), 600); };
  return (
    <div className="product-card-new">
      <div className="product-card-new-img-wrap">
        {product.isOffer && <span className="product-badge-offer">%</span>}
        {outOfStock && <span className="product-badge-out">نفذ</span>}
        {lowStock && <span className="product-badge-low">بقية {product.stock_quantity}</span>}
        <img src={product.imageUrl} alt={product.name} className="product-card-new-img" loading="lazy"
          onError={productImgError} />
        {!outOfStock && (
          <div className="product-card-new-actions">
            {cartQty > 0 && (
              <span className="product-card-cart-qty">{cartQty}</span>
            )}
            <button className={`product-card-new-add ${added ? 'added' : ''}`} onClick={handleAdd}>
              {added ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              )}
            </button>
          </div>
        )}
      </div>
      <div className="product-card-new-body">
        <div className="product-card-new-cat">{product.category}</div>
        <div className="product-card-new-name">{product.name}</div>
        <div className="product-card-new-price-row">
          <div className="product-card-new-price">
            {product.isOffer && product.offerPrice != null ? (
              <><span className="offer-old">{product.price.toFixed(2)}</span> {product.offerPrice.toFixed(2)}</>
            ) : product.price.toFixed(2)}
            <span className="product-card-new-currency"> ر.س</span>
          </div>
          <div className="product-card-new-unit">{product.unit}</div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
