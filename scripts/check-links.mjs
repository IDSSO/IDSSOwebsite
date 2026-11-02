// Internal link checker for dist/ (no external requests; zero dependencies).
// Verifies every href/src/background-image that points inside the site resolves to a built file.
// Paths under /uploads/ and /nmo/ (and /favicon.ico, generated from the icon) are reported separately: they are mirrored assets that are
// expected to be missing until `npm run mirror` has been run (see README).
//
//   npm run links              # fail on broken internal links; warn on missing mirrored assets
//   npm run links -- --strict  # also fail on missing mirrored assets (use once media is mirrored)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const strict = process.argv.includes('--strict');

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.html') || ent.name.endsWith('.css')) out.push(p);
  }
  return out;
}

function exists(urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const candidates = [
    path.join(dist, clean),
    path.join(dist, clean, 'index.html'),
    path.join(dist, clean.replace(/\/$/, '') + '.html'),
  ];
  return candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

const files = walk(dist);
const broken = [];
const missingMirrored = new Set();
const checked = new Set();
const attrRe = /(?:href|src|data|action|content)=["']([^"']+)["']/g;
const cssUrlRe = /url\(["']?([^"')]+)["']?\)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const refs = [];
  for (const m of text.matchAll(attrRe)) refs.push(m[1]);
  for (const m of text.matchAll(cssUrlRe)) refs.push(m[1]);
  for (let ref of refs) {
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;        // external, mailto, relative-to-page, etc.
    if (ref.startsWith('/uploads/') || ref.startsWith('/nmo/') || ref === '/favicon.ico') {
      if (!exists(ref)) missingMirrored.add(ref);
      continue;
    }
    const key = ref.split('#')[0];
    if (checked.has(key)) continue;
    checked.add(key);
    if (!exists(key)) broken.push({ ref, file: path.relative(dist, file) });
  }
}

// Trailing-slash policy: every HTML page must be a directory index (Astro trailingSlash:'always').
const nonIndex = files.filter((f) => f.endsWith('.html') && path.basename(f) !== 'index.html' && path.basename(f) !== '404.html');

console.log(`Checked ${checked.size} internal targets across ${files.length} files.`);
if (missingMirrored.size) {
  console.log(`\n${strict ? 'ERROR' : 'WARN'}: ${missingMirrored.size} mirrored asset(s) missing (run "npm run mirror"):`);
  [...missingMirrored].sort().forEach((r) => console.log('  ', r));
}
if (nonIndex.length) {
  console.log('\nERROR: pages not emitted as directory indexes:');
  nonIndex.forEach((f) => console.log('  ', path.relative(dist, f)));
}
if (broken.length) {
  console.log('\nERROR: broken internal links:');
  broken.forEach((b) => console.log(`   ${b.ref}  (in ${b.file})`));
}

const failed = broken.length > 0 || nonIndex.length > 0 || (strict && missingMirrored.size > 0);
console.log(failed ? '\nLink check FAILED.' : '\nLink check passed.');
process.exit(failed ? 1 : 0);
