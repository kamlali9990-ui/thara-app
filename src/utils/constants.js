export const BASE = import.meta.env.BASE_URL || '/';
export const PHONE = '00966503159093';
export const WHATSAPP_NUM = '966503159093';
export const EMAIL_1 = 'tharaalshrqwan@gmail.com';
export const EMAIL_2 = 'admin@tharasharqone.com';
export const SNAPCHAT = 'tharaaeastone';
export const logoPath = BASE + 'logo222.jpg';

export function productImgError(e) { if (e.target.src !== logoPath) e.target.src = logoPath; }

export function imgFallback(w, h, bg, fg, text) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + bg + '" width="' + w + '" height="' + h + '"/><text fill="' + fg + '" font-family="sans-serif" font-size="' + Math.min(w, h) / 6 + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + text + '</text></svg>');
}

const COLORS = ['127443','0d3d24','1a6b3a','0e5c2e','1b8a4a','2d6b3f','0a4d22','166b35'];

export function safeProductUrl(url, name) {
  if (!url || !url.includes('unsplash.com')) return url || logoPath;
  const short = (name || '').replace(/[()]/g, '').trim().substring(0, 28);
  const color = COLORS[name ? name.length % COLORS.length : 0];
  return `https://placehold.co/400x400/${color}/FFFFFF?text=${encodeURIComponent(short)}`;
}

export function cleanProductImages(products) {
  if (!products) return products;
  return products.map(p => ({ ...p, imageUrl: safeProductUrl(p.imageUrl, p.name) }));
}

export const KHAFJI_BOUNDS = { minLat: 28.35, maxLat: 28.50, minLng: 48.40, maxLng: 48.55 };
export const SHOP_POS = { lat: 28.451344737377184, lng: 48.49170927325617 };

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
