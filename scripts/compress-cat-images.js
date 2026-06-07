import { Jimp } from 'jimp';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const PUBLIC = join(import.meta.dirname, '..', 'public');
const files = readdirSync(PUBLIC).filter(f => f.startsWith('cat_') && f.endsWith('.png'));

async function main() {
  for (const file of files) {
    const sizeMB = statSync(join(PUBLIC, file)).size / 1024 / 1024;
    if (sizeMB < 0.1) continue; // skip already small files
    const outName = file.replace('.png', '.jpg');
    const outPath = join(PUBLIC, outName);
    const img = await Jimp.read(join(PUBLIC, file));
    img.resize({ h: 300 });
    await img.write(outPath, { quality: 70 });
    const newSize = statSync(outPath).size / 1024;
    console.log(`${file} (${sizeMB.toFixed(1)}MB) → ${outName} (${newSize.toFixed(0)}KB)`);
  }
}
main().catch(console.error);
