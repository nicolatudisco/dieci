#!/usr/bin/env node
/**
 * The night lights of `toscana` and `italia`, from NASA Black Marble 2016 (grayscale):
 *
 *   node scripts/geodata/black-marble.mjs
 *
 * The 500 m tile C1 (0–90° E, 0–90° N) covers Italy; where a picture reaches beyond it (west
 * of Greenwich) the 3 km global map fills in. Both are reprojected into the same orthographic
 * projection as every other map of the site (centred on the starting point, metres), so the
 * lights lie exactly on coasts and roads. Output: public/data/night-italia.webp,
 * night-toscana.webp and night.json (where each picture lies, in metres).
 *
 * Credit: NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from
 * Miguel Román, NASA's Goddard Space Flight Center (see CREDITS.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cachedDownload, makeProjection, OUT, readOrigin, writeOut } from './common.mjs';

const BASE = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/';

/** Pictures to make: box in metres [x0, y0, x1, y1] and size in pixels (square). */
const PICTURES = {
  // Centred where the view of `italia` is centred (stage.ts), 3,200 km across.
  italia: { box: [-1500e3, -1810e3, 1700e3, 1390e3], size: 4096 },
  // Centred where the view of `toscana` is centred, 420 km across.
  toscana: { box: [-245e3, -215e3, 175e3, 205e3], size: 2048 },
};

const origin = readOrigin();
const proj = makeProjection(origin);

/** A grey raster on a regular lon/lat grid. */
async function loadGrid(file, { lon0, lat0, degPerPx, crop, blur = 0 }) {
  const image = sharp(file, { limitInputPixels: false });
  const meta = await image.metadata();
  const left = crop ? Math.max(0, Math.floor((crop.lon0 - lon0) / degPerPx)) : 0;
  const top = crop ? Math.max(0, Math.floor((lat0 - crop.lat1) / degPerPx)) : 0;
  const right = crop ? Math.min(meta.width, Math.ceil((crop.lon1 - lon0) / degPerPx)) : meta.width;
  const bottom = crop ? Math.min(meta.height, Math.ceil((lat0 - crop.lat0) / degPerPx)) : meta.height;
  const width = right - left;
  const height = bottom - top;
  // A slight blur: the source pixels are coarse squares, and lights seen from space are soft.
  let pipeline = image.extract({ left, top, width, height }).greyscale();
  if (blur > 0) pipeline = pipeline.blur(blur);
  const data = await pipeline.raw().toBuffer();
  const channels = data.length / (width * height);
  return {
    /** Bilinear sample at lon/lat, or -1 outside the grid. */
    sample(lat, lon) {
      const fx = (lon - lon0) / degPerPx - left - 0.5;
      const fy = (lat0 - lat) / degPerPx - top - 0.5;
      if (fx < 0 || fy < 0 || fx >= width - 1 || fy >= height - 1) return -1;
      const x = Math.floor(fx);
      const y = Math.floor(fy);
      const tx = fx - x;
      const ty = fy - y;
      const at = (i, j) => data[((y + j) * width + (x + i)) * channels];
      return (at(0, 0) * (1 - tx) + at(1, 0) * tx) * (1 - ty) + (at(0, 1) * (1 - tx) + at(1, 1) * tx) * ty;
    },
  };
}

console.log('Black Marble 2016 (NASA)');
const fine = await loadGrid(await cachedDownload(`${BASE}BlackMarble_2016_C1_gray.jpg`, 'BlackMarble_2016_C1_gray.jpg'), {
  lon0: 0,
  lat0: 90,
  degPerPx: 90 / 21600,
  crop: { lon0: 0, lon1: 30, lat0: 28, lat1: 56 },
  blur: 1.1,
});
const coarse = await loadGrid(await cachedDownload(`${BASE}BlackMarble_2016_3km_gray.jpg`, 'BlackMarble_2016_3km_gray.jpg'), {
  lon0: -180,
  lat0: 90,
  degPerPx: 360 / 13500,
});

fs.mkdirSync(OUT, { recursive: true });
const meta = {};
for (const [name, { box, size }] of Object.entries(PICTURES)) {
  const [x0, y0, x1, y1] = box;
  const out = Buffer.alloc(size * size);
  for (let j = 0; j < size; j++) {
    const y = y1 - ((j + 0.5) / size) * (y1 - y0);
    for (let i = 0; i < size; i++) {
      const x = x0 + ((i + 0.5) / size) * (x1 - x0);
      const ll = proj.inverse(x, y);
      if (!ll) continue;
      let v = fine.sample(ll[0], ll[1]);
      if (v < 0) v = coarse.sample(ll[0], ll[1]);
      out[j * size + i] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  const file = `night-${name}.webp`;
  await sharp(out, { raw: { width: size, height: size, channels: 1 } }).webp({ quality: 82, effort: 6 }).toFile(path.join(OUT, file));
  console.log(`  public/data/${file}`);
  meta[name] = { file, box };
}
writeOut('night.json', meta);
