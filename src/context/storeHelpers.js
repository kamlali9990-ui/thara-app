export const STATUS_ORDER = ['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];

export const getStatusIndex = (s) => STATUS_ORDER.indexOf(s);

export const isValidStatusTransition = (current, next) => {
  if (next === 'ملغي') return true;
  const ci = getStatusIndex(current);
  const ni = getStatusIndex(next);
  if (ci === -1 || ni === -1) return false;
  return ni >= ci - 1;
};

export const getProductPrice = (p) => p.isOffer && p.offerPrice != null ? p.offerPrice : p.price;

export const getStock = (products, productId) => {
  const p = products.find(x => x.id === productId);
  return p ? p.stock_quantity : 999;
};
