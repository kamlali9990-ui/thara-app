const { Jimp } = require('jimp');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '..', 'public', 'LOGO.jpg');
const GREEN = 0xFF127443;
const SIZES = [
  { size: 192, out: path.resolve(__dirname, '..', 'public', 'icon-192.png') },
  { size: 512, out: path.resolve(__dirname, '..', 'public', 'icon-512.png') },
];

async function main() {
  const logo = await Jimp.read(LOGO_PATH);

  for (const { size, out } of SIZES) {
    // Green background canvas
    const icon = new Jimp({ width: size, height: size, color: GREEN });

    // Resize logo to fit within safe zone (75% of size for padding)
    const safeSize = Math.round(size * 0.75);
    const logoResized = logo.clone().contain({ w: safeSize, h: safeSize });

    // Center on green canvas
    const x = Math.round((size - logoResized.bitmap.width) / 2);
    const y = Math.round((size - logoResized.bitmap.height) / 2);
    icon.composite(logoResized, x, y);

    await icon.write(out);
    console.log(`Created ${size}x${size}: ${out}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
