const STORAGE_KEY = 'thara_recently_viewed';
const MAX_ITEMS = 12;

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addRecentlyViewed(product) {
  if (!product || !product.id) return;
  try {
    const list = getRecentlyViewed().filter(p => p.id !== product.id);
    list.unshift({ id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.price, isOffer: product.isOffer, offerPrice: product.offerPrice, category: product.category, unit: product.unit });
    if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('thara:recently-viewed'));
  } catch {}
}
