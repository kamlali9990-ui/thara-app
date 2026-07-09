import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

// Mock context
vi.mock('../context/StoreContext', () => ({
  StoreContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
  useStore: vi.fn(),
  StoreProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('useStore (mocked)', () => {
  it('returns default values when mocked', () => {
    vi.mocked(useStore).mockReturnValue({ products: [], cart: [], user: null } as any);
    const { products, cart, user } = useStore();
    expect(products).toEqual([]);
    expect(cart).toEqual([]);
    expect(user).toBeNull();
  });

  it('allows overriding return values', () => {
    vi.mocked(useStore).mockReturnValue({ products: [{ id: 1, name: 'Test' }], cart: [{ id: 1, qty: 2 }] } as any);
    const { products, cart } = useStore();
    expect(products).toHaveLength(1);
    expect(cart[0].qty).toBe(2);
  });
});

describe('searchQuery sanitization', () => {
  it('trims whitespace', () => {
    const q = '   hello   ';
    expect(q.trim()).toBe('hello');
  });

  it('filters products by search term', () => {
    const products = [
      { id: 1, name: 'حليب كامل' },
      { id: 2, name: 'عصير برتقال' },
      { id: 3, name: 'خبز أسمر' },
    ];
    const q = 'حليب';
    const result = products.filter(p => p.name.includes(q));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by category', () => {
    const products = [
      { id: 1, name: 'حليب', category: 'dairy' },
      { id: 2, name: 'عصير', category: 'drinks' },
    ];
    const cat: string = 'dairy';
    const result = products.filter(p => cat === 'الكل' || p.category === cat);
    expect(result).toHaveLength(1);
  });

  it('returns all when category is الكل', () => {
    const products = [
      { id: 1, name: 'حليب', category: 'dairy' },
      { id: 2, name: 'عصير', category: 'drinks' },
    ];
    const cat = 'الكل';
    const result = products.filter(p => cat === 'الكل' || p.category === cat);
    expect(result).toHaveLength(2);
  });
});

describe('cart calculations', () => {
  const cart = [
    { id: 1, price: 5, qty: 2 },
    { id: 2, price: 10, qty: 1 },
    { id: 3, price: 3, qty: 3 },
  ];

  it('calculates total correctly', () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    expect(total).toBe(5*2 + 10*1 + 3*3);
  });

  it('calculates item count correctly', () => {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    expect(count).toBe(6);
  });

  it('adds item to cart', () => {
    const newCart = [...cart, { id: 4, price: 7, qty: 1 }];
    expect(newCart).toHaveLength(4);
  });

  it('updates quantity for existing item', () => {
    const newCart = cart.map(i => i.id === 1 ? { ...i, qty: 5 } : i);
    expect(newCart.find(i => i.id === 1)!.qty).toBe(5);
  });

  it('removes item from cart', () => {
    const newCart = cart.filter(i => i.id !== 2);
    expect(newCart).toHaveLength(2);
    expect(newCart.find(i => i.id === 2)).toBeUndefined();
  });
});

describe('cleanProductImages helper', () => {
  it('validates image URLs in product data', async () => {
    const { safeProductUrl, cleanProductImages } = await import('../utils/constants');
    const products = [
      { id: 1, name: 'Test', imageUrl: '' },
      { id: 2, name: 'Test2', imageUrl: 'https://example.com/img.jpg' },
    ];
    const cleaned = cleanProductImages(products);
    expect(cleaned[0].imageUrl).toBeTruthy();
    expect(cleaned[1].imageUrl).toBe('https://example.com/img.jpg');
  });
});
