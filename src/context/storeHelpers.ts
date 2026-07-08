import type { Product, OrderStatus, CartItem } from '../types';

export const STATUS_ORDER: OrderStatus[] = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];

export const getStatusIndex = (s: string): number => STATUS_ORDER.indexOf(s as OrderStatus);

export const isValidStatusTransition = (current: string, next: string): boolean => {
  if (next === 'ملغي') return true;
  const ci = getStatusIndex(current);
  const ni = getStatusIndex(next);
  if (ci === -1 || ni === -1) return false;
  return ni >= ci - 1;
};

export const getProductPrice = (p: Product): number => p.isOffer && p.offerPrice != null ? p.offerPrice : p.price;

export const getStock = (products: Product[], productId: number): number => {
  const p = products.find(x => x.id === productId);
  return p ? p.stock_quantity : 999;
};
