const { Jimp } = require('jimp');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '..', 'public', 'LOGO.jpg');
const DARK_GREEN = 0xFF0A5C34;
const GOLD = 0xFFD4A017;
const SIZES = [
  { size: 192, border: 10, out: path.resolve(__dirname, '..', 'public', 'icon-192.png') },
  { size: 512, border: 26, out: path.resolve(__dirname, '..', 'public', 'icon-512.png') },
];

async function main() {
  const logo = await Jimp.read(LOGO_PATH);

  for (const { size, border, out } of SIZES) {
    // Gold background (becomes the border)
    const icon = new Jimp({ width: size, height: size, color: GOLD });

    // Dark green inner square
    const innerSize = size - border * 2;
    const greenInner = new Jimp({ width: innerSize, height: innerSize, color: DARK_GREEN });

    // Logo centered on green
    const safeSize = Math.round(innerSize * 0.8);
    const logoResized = logo.clone().contain({ w: safeSize, h: safeSize });
    const lx = Math.round((innerSize - logoResized.bitmap.width) / 2);
    const ly = Math.round((innerSize - logoResized.bitmap.height) / 2);
    greenInner.composite(logoResized, lx, ly);

    // Place green+logo onto gold frame
    icon.composite(greenInner, border, border);

    await icon.write(out);
    console.log(`Created ${size}x${size}: ${out}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });