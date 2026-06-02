const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const COLORS = {
  'cat_electronics.png': '#3b82f6',
  'cat_kitchen.png': '#ef4444',
  'cat_clothing.png': '#06b6d4',
  'cat_toys.png': '#ec4899',
  'cat_hardware.png': '#f97316'
};

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++)
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const pixelRow = Buffer.alloc(1 + width * 3);
  pixelRow[0] = 0; // filter byte
  for (let x = 0; x < width; x++) {
    pixelRow[1 + x * 3] = r;
    pixelRow[2 + x * 3] = g;
    pixelRow[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array(height).fill(pixelRow));
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const [name, color] of Object.entries(COLORS)) {
  const fp = path.join('public', name);
  const col = color.replace('#', '');
  const r = parseInt(col.substr(0, 2), 16);
  const g = parseInt(col.substr(2, 2), 16);
  const b = parseInt(col.substr(4, 2), 16);
  const png = makePNG(100, 100, r, g, b);
  fs.writeFileSync(fp, png);
  console.log('Created: ' + name + ' (' + color + ')');
}
