const sharp = require('sharp');
const path = require('path');

const BG = '#127443';
const SIZES = [192, 512];

function cartSvg(size) {
  const p = size * 0.08;
  const s = (size - p * 2) / 64;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#158a4e"/>
      <stop offset="100%" stop-color="#0d5c32"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <g transform="translate(${p}, ${p}) scale(${s})" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- Cart handle -->
    <path d="M14 18 L22 18 L28 42 L50 42"/>
    <!-- Cart body -->
    <path d="M26 36 L52 36 L48 52 L22 52 Z"/>
    <!-- Wheel left -->
    <circle cx="26" cy="58" r="4" fill="#fbbf24" stroke="#fbbf24"/>
    <!-- Wheel right -->
    <circle cx="46" cy="58" r="4" fill="#fbbf24" stroke="#fbbf24"/>
    <!-- Checkmark -->
    <path d="M32 44 L37 49 L46 38" stroke="#fbbf24" stroke-width="4"/>
    <!-- Items in cart -->
    <circle cx="32" cy="26" r="3" fill="#fff" stroke="none" opacity="0.5"/>
    <circle cx="40" cy="24" r="2.5" fill="#fff" stroke="none" opacity="0.4"/>
    <circle cx="36" cy="22" r="2" fill="#fbbf24" stroke="none" opacity="0.6"/>
  </g>
</svg>`;
}

async function main() {
  for (const size of SIZES) {
    const svg = Buffer.from(cartSvg(size));
    const out = path.resolve(__dirname, '..', 'public', `cart-icon-${size}.png`);
    await sharp(svg).png().toFile(out);
    console.log(`Created ${size}x${size}: ${out}`);

    // Maskable version (80% safe zone)
    const maskSize = Math.round(size * 0.8);
    const maskSvg = Buffer.from(cartSvg(maskSize));
    const padded = await sharp(maskSvg)
      .resize(maskSize, maskSize)
      .extend({
        top: Math.round((size - maskSize) / 2),
        bottom: Math.round((size - maskSize) / 2),
        left: Math.round((size - maskSize) / 2),
        right: Math.round((size - maskSize) / 2),
        background: { r: 18, g: 116, b: 67, alpha: 1 }
      })
      .png()
      .toBuffer();
    const maskOut = path.resolve(__dirname, '..', 'public', `cart-icon-maskable-${size}.png`);
    await sharp(padded).toFile(maskOut);
    console.log(`Created maskable ${size}x${size}: ${maskOut}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
