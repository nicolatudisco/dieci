#!/usr/bin/env node
/**
 * The pictures of the bodies shown in the lenses of M3: the Moon, Jupiter, Saturn and its
 * rings. Run it once, by hand, from the project root:
 *
 *   node scripts/textures.mjs
 *
 * Source: Solar System Scope (https://www.solarsystemscope.com/textures/), licence CC BY 4.0
 * (checked on their page when downloading): credit in CREDITS.md. The site never downloads
 * anything at runtime: the resized pictures go to public/textures/ and are committed.
 *
 * A lens is at most 384 device pixels wide, so 1024 × 512 is more than enough for a globe.
 *
 * Also the photo «Pale Blue Dot» for the «saperne di più» of `pianeti-lontani`: the version
 * of 2020 (PIA23645), NASA/JPL-Caltech, public domain. Cropped to a square around the
 * sunbeam, so that the Earth, a speck inside it, is still a few pixels.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = 'https://www.solarsystemscope.com/textures/download/';
const CACHE = path.resolve('scripts/cache');
const OUT = path.resolve('public/textures');

/** name in public/textures → source file and size. */
const PICTURES = {
  'moon.webp': { source: '2k_moon.jpg', width: 1024, height: 512, quality: 82 },
  'jupiter.webp': { source: '2k_jupiter.jpg', width: 1024, height: 512, quality: 82 },
  'saturn.webp': { source: '2k_saturn.jpg', width: 1024, height: 512, quality: 82 },
  // The rings: one row of colour and transparency, from the inside to the outside edge.
  'saturn-ring.webp': { source: '2k_saturn_ring_alpha.png', width: 1024, height: 16, quality: 90, alpha: true },
};

async function download(name, url = `${BASE}${name}`) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  console.log(`  scarico ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'dieci-textures/1.0 (one-off script)' } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

fs.mkdirSync(OUT, { recursive: true });
console.log('Texture di Luna, Giove e Saturno (Solar System Scope, CC BY 4.0)');
for (const [name, p] of Object.entries(PICTURES)) {
  const file = await download(p.source);
  let image = sharp(file).resize(p.width, p.height, { fit: 'fill', kernel: 'lanczos3' });
  if (!p.alpha) image = image.removeAlpha();
  const out = path.join(OUT, name);
  await image.webp({ quality: p.quality, alphaQuality: 100, effort: 6 }).toFile(out);
  console.log(`  public/textures/${name}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

// The photo «Pale Blue Dot» (2020). The Earth is at (3111, 2688) in the 5230 × 5175 original.
const PHOTO = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia23/pia23645/PIA23645.jpg';
const EARTH = [3111, 2688];
const CROP = 3200;
const SIDE = 900;
const photo = await download('PIA23645.jpg', PHOTO);
const left = EARTH[0] - 1700;
const top = EARTH[1] - 1600;
const images = path.resolve('public/images');
fs.mkdirSync(images, { recursive: true });
const out = path.join(images, 'pale-blue-dot.webp');
await sharp(photo).extract({ left, top, width: CROP, height: CROP }).resize(SIDE, SIDE, { kernel: 'lanczos3' }).webp({ quality: 92, effort: 6 }).toFile(out);
console.log(`  public/images/pale-blue-dot.webp: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
console.log(`  la Terra è a x = ${((EARTH[0] - left) / CROP).toFixed(4)}, y = ${((EARTH[1] - top) / CROP).toFixed(4)} della foto`);
