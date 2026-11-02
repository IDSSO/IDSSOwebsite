// Generate favicon sizes from public/uploads/2025/12/cropped-Icon.png (512×512):
//   cropped-Icon-32x32.png, cropped-Icon-192x192.png, cropped-Icon-180x180.png, and public/favicon.ico
// Run after `npm run mirror` (needs the source icon). Usage: npm run icons
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dir = path.join(root, 'public/uploads/2025/12');
const source = path.join(dir, 'cropped-Icon.png');

if (!fs.existsSync(source)) {
  console.error(`Source icon not found: ${source}\nRun "npm run mirror -- media" first.`);
  process.exit(1);
}

const sizes = [32, 192, 180];
for (const size of sizes) {
  const out = path.join(dir, `cropped-Icon-${size}x${size}.png`);
  await sharp(source).resize(size, size).png().toFile(out);
  console.log('wrote', path.relative(root, out));
}

// favicon.ico: an ICO container holding 16, 32 and 48px PNG images (PNG-in-ICO is supported by all modern browsers).
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => sharp(source).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // type: icon
header.writeUInt16LE(pngs.length, 4);  // image count
const entries = [];
let offset = 6 + 16 * pngs.length;
pngs.forEach((buf, i) => {
  const e = Buffer.alloc(16);
  const s = icoSizes[i];
  e.writeUInt8(s === 256 ? 0 : s, 0);  // width
  e.writeUInt8(s === 256 ? 0 : s, 1);  // height
  e.writeUInt8(0, 2);                  // palette
  e.writeUInt8(0, 3);                  // reserved
  e.writeUInt16LE(1, 4);               // planes
  e.writeUInt16LE(32, 6);              // bpp
  e.writeUInt32LE(buf.length, 8);      // size
  e.writeUInt32LE(offset, 12);         // offset
  offset += buf.length;
  entries.push(e);
});
const ico = Buffer.concat([header, ...entries, ...pngs]);
fs.writeFileSync(path.join(root, 'public/favicon.ico'), ico);
console.log('wrote public/favicon.ico');
