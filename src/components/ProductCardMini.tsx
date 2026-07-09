import { memo, useState } from 'react';
import { productImgError } from '../utils/constants';
import { optimizeCloudinaryUrl } from '../utils/images';

const ProductCardMini = memo(({ product, addToCart }: { product: any; addToCart: (p: any) => void }) => {
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity === 0;
  const handleAdd = (e: any) => { 
    if (outOfStock) return;
    e.stopPropagation();
    addToCart(product); 
    setAdded(true); 
    setTimeout(() => setAdded(false), 600); 
  };
  return (
    <div className="product-card-mini-item">
      <div className="mini-card-img-wrap">
        {product.isOffer && <span className="mini-card-badge-offer">%</span>}
        {outOfStock && <span className="product-badge-out">نفذ</span>}
        <img src={optimizeCloudinaryUrl(product.imageUrl, 200)} alt={product.name} className="mini-card-img" loading="lazy"
          onError={productImgError as any} />
        {!outOfStock && (
          <button className={`mini-card-add ${added ? 'added' : ''}`} onClick={handleAdd}>
            {added ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </button>
        )}
      </div>
      <div className="mini-card-body">
        <div className="mini-card-name">{product.name}</div>
        <div className="mini-card-price-row">
          <div>
            <span className="mini-card-price">{product.offerPrice ? product.offerPrice.toFixed(2) : product.price.toFixed(2)}<span className="mini-card-currency"> ر.س</span></span>
            {product.offerPrice && <span className="mini-card-old-price">{product.price.toFixed(2)}</span>}
          </div>
          <div className="mini-card-unit">{product.unit}</div>
        </div>
      </div>
    </div>
  );
});

export default ProductCardMini;
