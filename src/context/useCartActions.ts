import { useMemo, useCallback } from 'react';
import { showToast } from '../components/Toast';
import { getProductPrice, getStock } from './storeHelpers';
import type { Product, CartItem } from '../types';

interface UseCartActionsProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export function useCartActions({ products, cart, setCart }: UseCartActionsProps) {
  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const newQty = existing ? existing.qty + 1 : 1;
      const stock = getStock(products, product.id);
      if (newQty > stock) {
        showToast(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`, 'warning');
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: newQty } : item);
      }
      if (!localStorage.getItem('pwa-install-cart-triggered')) {
        window.dispatchEvent(new CustomEvent('cart-install-trigger'));
      }
      return [...prev, { ...product, qty: 1, currentPrice: getProductPrice(product) }];
    });
  }, [products, setCart]);

  const removeFromCart = useCallback((id: number) => setCart(prev => prev.filter(item => item.id !== id)), [setCart]);

  const updateCartQty = useCallback((id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        const stock = getStock(products, id);
        if (newQty > stock) {
          showToast(`الكمية المطلوبة تتجاوز المتوفر (المتوفر: ${stock})`, 'warning');
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  }, [products, setCart]);

  const cartTotal = useMemo((): number => {
    return cart.reduce((total, item) => total + ((item.currentPrice ?? 0) * (item.qty ?? 0)), 0);
  }, [cart]);

  return { addToCart, removeFromCart, updateCartQty, cartTotal };
}
