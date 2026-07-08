export const BASE = import.meta.env.BASE_URL || '/';
export const PHONE = '00966503203994';
export const WHATSAPP_NUM = '966503203994';
export const EMAIL_1 = 'tharaalshrqwan@gmail.com';
export const EMAIL_2 = 'admin@tharasharqone.com';
export const SNAPCHAT = 'tharaaeastone';
export const logoPath = BASE + 'logo222.jpg';
export const logoPathDark = BASE + 'logonaet.jpg';

export function productImgError(e) { if (e.target.src !== logoPath) e.target.src = logoPath; }

export function imgFallback(w, h, bg, fg, text) {
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const size = Math.round(Math.min(w, h) / 9);
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + esc(bg) + '" width="' + w + '" height="' + h + '"/><text fill="' + esc(fg) + '" font-family="sans-serif" font-size="' + size + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + esc(text) + '</text></svg>');
}

export function safeProductUrl(url, _name) {
  if (!url || typeof url !== 'string') return logoPath;
  const s = url.trim();
  if (!s) return logoPath;
  if (isBlockedImageUrl(s) || s.includes('unsplash.com')) return logoPath;
  if (s.startsWith('/')) return s;
  if (s.startsWith('http://')) return 'https://' + s.slice(7);
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('http')) return s;
  if (s.includes('/')) return 'https://' + s;
  return logoPath;
}

export function cleanProductImages(products) {
  if (!products) return products;
  return products.map(p => ({ ...p, imageUrl: safeProductUrl(p.imageUrl, p.name) }));
}

export const BLOCKED_DOMAINS = [
  'facebook.com',
  'fbsbx.com',
  'fbcdn.net',
  'instagram.com',
  'cdninstagram.com',
  'pinterest.com',
  'pinimg.com',
  'twitter.com',
  'twimg.com',
  'tiktok.com',
  'tiktokcdn',
  'aalalkaif.com'
];

export function isBlockedImageUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const s = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => s.includes(domain));
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
