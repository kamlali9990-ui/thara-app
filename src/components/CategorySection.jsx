import { memo } from 'react';
import ProductCard from './ProductCard';

import { sectionCats } from '../data/categories';

const CategorySection = memo(({ category, products, addToCart, cart, onViewAll }) => {
  const catInfo = sectionCats.find(c => c.name === category) || { img: '', fallback: '📦' };
  const maxDisplay = products.slice(0, 9);

  return (
    <div className="home-section-card category-section-card">
      <div className="category-section-header">
        <div className="category-section-header-img-wrap">
          {catInfo.img ? (
            <img src={catInfo.img} alt={category} className="category-section-header-img"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          ) : null}
          <span className="category-section-header-fallback" style={{ display: catInfo.img ? 'none' : 'flex' }}>
            {catInfo.fallback}
          </span>
        </div>
        <div className="category-section-header-text">
          <h3 className="category-section-title">{category}</h3>
          <span className="category-section-count">{products.length} منتج</span>
        </div>
        {products.length > 9 && (
          <button className="category-section-view-all" onClick={() => onViewAll(category)}>
            عرض الكل
          </button>
        )}
      </div>
      <div className="category-section-grid">
        {maxDisplay.map(product => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} cart={cart} />
        ))}
      </div>
    </div>
  );
});

export default CategorySection;
