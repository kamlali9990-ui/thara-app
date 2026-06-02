import { memo } from 'react';
import ProductCard from './ProductCard';
import { BASE } from '../utils/constants';

const CATEGORY_IMAGES = {
  'مواد غذائية': { img: `${BASE}cat_canned.png`, fallback: '🥫' },
  'منظفات': { img: `${BASE}cat_vegetables.jpg`, fallback: '🧹' },
  'إلكترونيات': { img: `${BASE}cat_electronics.png`, fallback: '📱' },
  'أواني': { img: `${BASE}cat_kitchen.png`, fallback: '🍳' },
  'مكسرات وبهارات': { img: `${BASE}cat_canned.jpg`, fallback: '🥜' },
  'خضروات وفواكه': { img: `${BASE}Getty.webp`, fallback: '🥦' },
  'ألعاب': { img: `${BASE}cat_toys.png`, fallback: '🎮' },
  'مجموعة الأصناف': { img: `${BASE}cat_dairy.jpg`, fallback: '📦' },
  'ملابس': { img: `${BASE}cat_clothing.png`, fallback: '👕' },
  'مواد البناء': { img: `${BASE}cat_hardware.png`, fallback: '🔧' },
};

const CategorySection = memo(({ category, products, addToCart, cart, onViewAll }) => {
  const catInfo = CATEGORY_IMAGES[category] || { img: '', fallback: '📦' };
  const maxDisplay = products.slice(0, 6);

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
        {products.length > 6 && (
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
