import { Jimp } from 'jimp';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

const SOURCE = join(publicDir, 'LOGO.jpg');
const SIZES = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-maskable-192.png' },
  { size: 512, name: 'icon-maskable-512.png' },
];

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  const image = await Jimp.read(SOURCE);
  console.log(`Source: ${image.bitmap.width}x${image.bitmap.height}`);

  for (const { size, name } of SIZES) {
    const outPath = join(publicDir, name);
    const cloned = image.clone();
    cloned.resize({ w: size, h: size });
    await cloned.write(outPath);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  console.log('\nAll icons generated from LOGO.jpg');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
