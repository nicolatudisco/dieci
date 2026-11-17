#!/usr/bin/env node
/**
 * The pictures of the globe of `terra` and `luna`:
 *
 *   node scripts/geodata/globe.mjs
 *
 * The globe always has the starting point in the middle of its disc and never turns (the
 * warm dot must stay on Rifredi), so only one hemisphere is ever seen. Every picture is
 * therefore made in the SAME orthographic projection as every other map of the site
 * (common.mjs → makeProjection, centred on the starting point, on the sphere of stage.ts):
 * a square that covers the disc of the Earth, from -R to +R on both axes. The shader reads
 * it with uv = p.xy / R, and the globe lies exactly under the map of `italia`.
 *
 * Output (public/data/), 2048 × 2048, about 6 km a pixel in the middle:
 * - globe-day.webp     the Earth by day, NASA Blue Marble Next Generation, November 2004
 *                      (the month of her birthday), with topography and bathymetry
 * - globe-lights.webp  the lights at night, NASA Black Marble 2016 (3 km map)
 * - globe-clouds.webp  the clouds, Solar System Scope (CC BY 4.0)
 * - globe-land.webp    land and sea, Natural Earth 1:10m (public domain)
 *
 * Outside the disc every picture repeats its own edge, so that the limb has no dark seam.
 * Credits in CREDITS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cachedDownload, EARTH_RADIUS, makeProjection, OUT, readJson, readOrigin } from './common.mjs';

const SIZE = 2048;
/** Sub-samples per side of every output pixel, against aliasing. */
const SUPER = 3;

const BLUE_MARBLE =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/november/world.topo.bathy.200411.3x21600x10800.jpg';
const BLACK_MARBLE = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_3km_gray.jpg';
const CLOUDS = 'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg';
const NE_LAND = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson';

sharp.cache(false);
const origin = readOrigin();
const proj = makeProjection(origin);

/** A whole-world raster in plate carrée (longitude -180..180, latitude 90..-90), decoded to raw. */
async function loadWorld(file, { width, channels }) {
  const image = sharp(file, { limitInputPixels: false });
  let pipeline = width ? image.resize(width, width / 2, { kernel: 'lanczos3' }) : image;
  pipeline = channels === 1 ? pipeline.greyscale() : pipeline.removeAlpha();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return world(data, info.width, info.height, info.channels);
}

function world(data, w, h, channels) {
  return {
    /** Bilinear sample at lat/lon into `out` (one value per channel), wrapping in longitude. */
    sample(lat, lon, out) {
      const fx = ((lon + 180) / 360) * w - 0.5;
      const fy = Math.min(h - 1.001, Math.max(0, ((90 - lat) / 180) * h - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const xa = ((x0 % w) + w) % w;
      const xb = (xa + 1) % w;
      const ra = y0 * w;
      const rb = (y0 + 1) * w;
      for (let c = 0; c < channels; c++) {
        const v00 = data[(ra + xa) * channels + c];
        const v10 = data[(ra + xb) * channels + c];
        const v01 = data[(rb + xa) * channels + c];
        const v11 = data[(rb + xb) * channels + c];
        out[c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
      }
    },
  };
}

/** Land of Natural Earth, filled in plate carrée at 8192 × 4096 (through an SVG). */
async function loadLand() {
  const geojson = readJson(await cachedDownload(NE_LAND, 'ne_10m_land.geojson'));
  const W = 8192;
  const H = 4096;
  const parts = [];
  // A ring may jump from +180° to -180° of longitude: unwrap it, close it over the pole if it
  // goes all the way round (Antarctica), and draw it three times, a turn apart.
  const ring = (r) => {
    const pts = [];
    let shift = 0;
    let previous = null;
    for (const [lon, lat] of r) {
      if (previous !== null) {
        if (lon + shift - previous > 180) shift -= 360;
        else if (lon + shift - previous < -180) shift += 360;
      }
      previous = lon + shift;
      pts.push([previous, lat]);
    }
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first && last && Math.abs(last[0] - first[0]) > 180) {
      const pole = first[1] < 0 ? -90 : 90;
      pts.push([last[0], pole], [first[0], pole]);
    }
    return [-360, 0, 360]
      .map((offset) => `M${pts.map(([lon, lat]) => `${(((lon + offset + 180) / 360) * W).toFixed(1)} ${(((90 - lat) / 180) * H).toFixed(1)}`).join('L')}Z`)
      .join('');
  };
  for (const f of geojson.features) {
    const g = f.geometry;
    if (!g) continue;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    // One path per polygon (with its holes): a single huge attribute is too much for the parser.
    for (const p of polygons) parts.push(`<path d="${p.map(ring).join('')}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><g fill="#fff" fill-rule="evenodd">${parts.join('')}</g></svg>`;
  const { data, info } = await sharp(Buffer.from(svg), { limitInputPixels: false }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return world(data, info.width, info.height, info.channels);
}

console.log('Globo: Blue Marble (novembre), Black Marble, nuvole, terra e mare');
const [day, lights, clouds, land] = await Promise.all([
  cachedDownload(BLUE_MARBLE, 'world.topo.bathy.200411.3x21600x10800.jpg').then((f) => loadWorld(f, { width: 10800, channels: 3 })),
  cachedDownload(BLACK_MARBLE, 'BlackMarble_2016_3km_gray.jpg').then((f) => loadWorld(f, { channels: 1 })),
  cachedDownload(CLOUDS, '8k_earth_clouds.jpg').then((f) => loadWorld(f, { channels: 1 })),
  loadLand(),
]);

const R = EARTH_RADIUS;
const outDay = Buffer.alloc(SIZE * SIZE * 3);
const outLights = Buffer.alloc(SIZE * SIZE);
const outClouds = Buffer.alloc(SIZE * SIZE);
const outLand = Buffer.alloc(SIZE * SIZE);
const rgb = [0, 0, 0];
const one = [0];
const n = SUPER * SUPER;
/** Just inside the disc: points outside are pulled onto the limb (the edge repeats)... */
const LIMB = R * 0.99995;
/** ...for a thin ring around it; farther out, a plain dark ocean (it is never sampled). */
const MARGIN = R * 1.03;
const OCEAN = [8, 22, 58];

for (let j = 0; j < SIZE; j++) {
  for (let i = 0; i < SIZE; i++) {
    const cx = -R + ((i + 0.5) / SIZE) * 2 * R;
    const cy = R - ((j + 0.5) / SIZE) * 2 * R;
    if (Math.hypot(cx, cy) > MARGIN) {
      const k = j * SIZE + i;
      outDay[k * 3] = OCEAN[0];
      outDay[k * 3 + 1] = OCEAN[1];
      outDay[k * 3 + 2] = OCEAN[2];
      continue;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    let l = 0;
    let c = 0;
    let s = 0;
    for (let sj = 0; sj < SUPER; sj++) {
      for (let si = 0; si < SUPER; si++) {
        let x = -R + ((i + (si + 0.5) / SUPER) / SIZE) * 2 * R;
        let y = R - ((j + (sj + 0.5) / SUPER) / SIZE) * 2 * R;
        const rho = Math.hypot(x, y);
        if (rho > LIMB) {
          x *= LIMB / rho;
          y *= LIMB / rho;
        }
        const ll = proj.inverse(x, y);
        if (!ll) continue;
        const [lat, lon] = ll;
        day.sample(lat, lon, rgb);
        r += rgb[0];
        g += rgb[1];
        b += rgb[2];
        lights.sample(lat, lon, one);
        l += one[0];
        clouds.sample(lat, lon, one);
        c += one[0];
        land.sample(lat, lon, one);
        s += one[0];
      }
    }
    const k = j * SIZE + i;
    outDay[k * 3] = Math.round(r / n);
    outDay[k * 3 + 1] = Math.round(g / n);
    outDay[k * 3 + 2] = Math.round(b / n);
    outLights[k] = Math.round(l / n);
    outClouds[k] = Math.round(c / n);
    outLand[k] = Math.round(s / n);
  }
}

fs.mkdirSync(OUT, { recursive: true });
const write = async (name, data, channels, options) => {
  const file = path.join(OUT, name);
  await sharp(data, { raw: { width: SIZE, height: SIZE, channels } }).webp({ effort: 6, ...options }).toFile(file);
  console.log(`  public/data/${name}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};
await write('globe-day.webp', outDay, 3, { quality: 80 });
await write('globe-lights.webp', outLights, 1, { quality: 82 });
await write('globe-clouds.webp', outClouds, 1, { quality: 78 });
await write('globe-land.webp', outLand, 1, { quality: 90 });
