import { memo } from 'react';
import ProductCard from './ProductCard';

import { sectionCats, getCategoryImg, type SectionCat } from '../data/categories';
import type { Product, CartItem } from '../types';

interface CategorySectionProps {
  category: string;
  products: Product[];
  addToCart: (product: Product) => void;
  cart: CartItem[];
  onViewAll: (category: string) => void;
}

const CategorySection = memo<CategorySectionProps>(({ category, products, addToCart, cart, onViewAll }) => {
  const catInfo: SectionCat = sectionCats.find(c => c.name === category) || { name: category, img: '', fallback: '📦', color: '', desc: '' };
  const maxDisplay = products.slice(0, 9);

  return (
    <div className="home-section-card category-section-card">
      <div className="category-section-header">
        <div className="category-section-header-img-wrap">
          {getCategoryImg(catInfo) ? (
            <img src={getCategoryImg(catInfo)} alt={category} className="category-section-header-img"
              onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          ) : null}
          <span className="category-section-header-fallback" style={{ display: getCategoryImg(catInfo) ? 'none' : 'flex' }}>
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
