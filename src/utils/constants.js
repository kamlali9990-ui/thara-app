export const BASE = import.meta.env.BASE_URL || '/';
export const PHONE = '00966503159093';
export const WHATSAPP_NUM = '966503159093';
export const EMAIL_1 = 'tharaalshrqwan@gmail.com';
export const EMAIL_2 = 'admin@tharasharqone.com';
export const SNAPCHAT = 'tharaaeastone';
export const logoPath = BASE + 'logo222.jpg';

export function productImgError(e) { if (e.target.src !== logoPath) e.target.src = logoPath; }

export function imgFallback(w, h, bg, fg, text) {
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const size = Math.round(Math.min(w, h) / 9);
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect fill="' + esc(bg) + '" width="' + w + '" height="' + h + '"/><text fill="' + esc(fg) + '" font-family="sans-serif" font-size="' + size + '" x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle">' + esc(text) + '</text></svg>');
}

const COLORS = [
  'e74c3c','c0392b','e91e63','9b59b6','8e44ad','3498db','2980b9','1abc9c',
  '16a085','2ecc71','27ae60','f39c12','e67e22','d35400','e67e22','f1c40f',
  '1e8449','117a65','2471a3','7d3c98','a93226','b7950b','1a5276','0e6655',
  'd4ac0d','ba4a00','6c3483','2e86c1','28b463','cb4335','239b56','1f618d',
  'f1948a','85c1e9','82e0aa','d7bde2','f8c471','a3e4d7','f9e79f','aeb6bf',
  'ff6b6b','6c5ce7','00cec9','fd79a8','e17055','fab1a0','74b9ff','55efc4',
  '81ecec','a29bfe','ffeaa7','dfe6e9',
];

export function safeProductUrl(url, name) {
  if (!url || typeof url !== 'string') return logoPath;
  const s = url.trim();
  if (!s) return logoPath;
  if (isBlockedImageUrl(s) || s.includes('unsplash.com')) return logoPath;
  if (s.startsWith('http://')) return 'https://' + s.slice(7);
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('http')) return s;
  return 'https://' + s;
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
