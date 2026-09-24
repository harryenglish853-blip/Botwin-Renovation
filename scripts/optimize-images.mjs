#!/usr/bin/env node
/**
 * Creates responsive AVIF + WebP variants for real project photos.
 *
 *   npm i -D sharp
 *   npm run images
 *
 * Put original photos (JPG/PNG, ideally 2400px+ wide) in
 * assets/img/projects/. For each `name.jpg` this writes
 * name-640/1280/1920 .avif and .webp next to it. Reference the original
 * path in site.config.js (e.g. '/assets/img/projects/kitchen-after.jpg')
 * and the build emits a responsive <picture> automatically.
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img', 'projects');
const WIDTHS = [640, 1280, 1920];

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp is not installed. Run:  npm i -D sharp');
  process.exit(1);
}
if (!existsSync(DIR)) {
  console.log(`No photos yet — create ${path.relative(process.cwd(), DIR)}/ and add originals.`);
  process.exit(0);
}

const files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f) && !/-\d{3,4}\.\w+$/.test(f));
for (const f of files) {
  const base = path.join(DIR, f.replace(/\.\w+$/, ''));
  for (const w of WIDTHS) {
    const img = sharp(path.join(DIR, f)).rotate().resize({ width: w, withoutEnlargement: true });
    await img.clone().avif({ quality: 52 }).toFile(`${base}-${w}.avif`);
    await img.clone().webp({ quality: 74 }).toFile(`${base}-${w}.webp`);
  }
  console.log('✔', f);
}
console.log(files.length ? `Optimized ${files.length} photo(s).` : 'No original photos found.');
