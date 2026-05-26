const { Jimp } = require('jimp');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '..', 'public', 'LOGO.jpg');
const SIZES = [
  { size: 192, out: path.resolve(__dirname, '..', 'public', 'icon-192.png') },
  { size: 512, out: path.resolve(__dirname, '..', 'public', 'icon-512.png') },
];

async function main() {
  const logo = await Jimp.read(LOGO_PATH);

  for (const { size, out } of SIZES) {
    const icon = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });

    const safeSize = Math.round(size * 0.8);
    const logoResized = logo.clone().contain({ w: safeSize, h: safeSize });

    const x = Math.round((size - logoResized.bitmap.width) / 2);
    const y = Math.round((size - logoResized.bitmap.height) / 2);
    icon.composite(logoResized, x, y);

    await icon.write(out);
    console.log(`Created ${size}x${size}: ${out}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
