/**
 * Shared helpers of the geodata scripts: the starting point, the projection, simplification,
 * clipping and the compact encoding read by src/levels/geo/format.ts.
 *
 * Everything here runs once, on Nicola's machine. The site never downloads data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const CACHE = path.join(HERE, 'cache');
export const OUT = path.join(ROOT, 'public', 'data');

/** Mean radius of the Earth in metres: the same sphere as src/engine/stage.ts. */
export const EARTH_RADIUS = 6.371e6;

const ORIGIN_FILE = path.join(HERE, 'origin.local.json');

/**
 * The starting point of the journey. It lives only in origin.local.json, which git ignores:
 * see README.md. Never print it, never write it into an output file.
 */
export function readOrigin() {
  if (!fs.existsSync(ORIGIN_FILE)) {
    console.error(
      `Manca ${path.relative(ROOT, ORIGIN_FILE)}: è il file (fuori da git) con le coordinate del punto di partenza.\n` +
        `Vedi scripts/geodata/README.md per il formato, oppure chiedi a Nicola il punto.`,
    );
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(ORIGIN_FILE, 'utf8'));
  const { lat, lon } = data.origin ?? {};
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error(`${path.relative(ROOT, ORIGIN_FILE)}: servono origin.lat e origin.lon (gradi decimali).`);
    process.exit(1);
  }
  return { lat, lon, private: data };
}

const RAD = Math.PI / 180;

/**
 * Orthographic projection centred on the starting point, in metres: +x east, +y north.
 * Near the point it is the local plane; far away it is the Earth seen from straight above,
 * so the map of Italy lies exactly on the globe of the stop `terra`.
 */
export function makeProjection(origin) {
  const phi0 = origin.lat * RAD;
  const lam0 = origin.lon * RAD;
  const sin0 = Math.sin(phi0);
  const cos0 = Math.cos(phi0);
  return {
    /** [x, y] in metres, or null on the far side of the Earth. */
    forward(lat, lon) {
      const phi = lat * RAD;
      const dl = lon * RAD - lam0;
      const cosPhi = Math.cos(phi);
      const cosC = sin0 * Math.sin(phi) + cos0 * cosPhi * Math.cos(dl);
      if (cosC < 0) return null;
      return [EARTH_RADIUS * cosPhi * Math.sin(dl), EARTH_RADIUS * (cos0 * Math.sin(phi) - sin0 * cosPhi * Math.cos(dl))];
    },
    /** [lat, lon] in degrees for a point of the plane, or null outside the disc of the Earth. */
    inverse(x, y) {
      const rho = Math.hypot(x, y);
      if (rho > EARTH_RADIUS) return null;
      if (rho === 0) return [origin.lat, origin.lon];
      const c = Math.asin(rho / EARTH_RADIUS);
      const sinC = Math.sin(c);
      const cosC = Math.cos(c);
      const phi = Math.asin(cosC * sin0 + (y * sinC * cos0) / rho);
      const lam = lam0 + Math.atan2(x * sinC, rho * cosC * cos0 - y * sinC * sin0);
      return [phi / RAD, lam / RAD];
    },
  };
}

/** Projects a list of {lat, lon} (or [lon, lat] with `lonLat`) into metres, dropping hidden points. */
export function projectAll(proj, points, lonLat = false) {
  const out = [];
  for (const p of points) {
    const xy = lonLat ? proj.forward(p[1], p[0]) : proj.forward(p.lat, p.lon);
    if (xy) out.push(xy);
  }
  return out;
}

// ───────────────────────────────────────────────────────────── geometry

/** Douglas–Peucker simplification of a polyline (array of [x, y]), keeping the ends. */
export function simplify(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const t2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD = t2;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len2 === 0) d = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      }
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Simplifies a closed ring; drops it if it collapses. */
export function simplifyRing(ring, tolerance) {
  const open = samePoint(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring.slice();
  if (open.length < 3) return null;
  // Split at the farthest point from the first, so both halves keep their shape.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < open.length; i++) {
    const d = (open[i][0] - open[0][0]) ** 2 + (open[i][1] - open[0][1]) ** 2;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = simplify(open.slice(0, far + 1), tolerance);
  const b = simplify([...open.slice(far), open[0]], tolerance);
  const out = [...a, ...b.slice(1, -1)];
  return out.length >= 3 && Math.abs(ringArea(out)) > tolerance * tolerance ? out : null;
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2;
}

export function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

/** Cuts a polyline to the box [x0, y0, x1, y1]: returns the pieces inside. */
export function clipLine(points, box) {
  const [x0, y0, x1, y1] = box;
  const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  const pieces = [];
  let current = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const q = points[i - 1];
      const seg = clipSegment(q, p, box);
      if (seg) {
        if (current.length === 0 || !samePoint(current[current.length - 1], seg[0])) {
          if (current.length > 1) pieces.push(current);
          current = [seg[0]];
        }
        current.push(seg[1]);
        if (!inside(p)) {
          pieces.push(current);
          current = [];
        }
      } else if (current.length) {
        if (current.length > 1) pieces.push(current);
        current = [];
      }
    }
  }
  if (current.length > 1) pieces.push(current);
  return pieces;
}

/** Liang–Barsky. */
function clipSegment(a, b, [x0, y0, x1, y1]) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const tests = [
    [-dx, a[0] - x0],
    [dx, x1 - a[0]],
    [-dy, a[1] - y0],
    [dy, y1 - a[1]],
  ];
  for (const [p, q] of tests) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ];
}

/** Sutherland–Hodgman: a closed ring cut to the box (the cut follows the box edges). */
export function clipRing(ring, [x0, y0, x1, y1]) {
  const edges = [
    (p) => p[0] >= x0,
    (p) => p[0] <= x1,
    (p) => p[1] >= y0,
    (p) => p[1] <= y1,
  ];
  const cut = [
    (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])],
    (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0],
    (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1],
  ];
  let out = samePoint(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring.slice();
  for (let e = 0; e < 4 && out.length; e++) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const inCur = edges[e](cur);
      const inPrev = edges[e](prev);
      if (inCur) {
        if (!inPrev) out.push(cut[e](prev, cur));
        out.push(cur);
      } else if (inPrev) out.push(cut[e](prev, cur));
    }
  }
  return out.length >= 3 ? out : null;
}

/** Bounding box of a list of points. */
export function bounds(points) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

export function boxesOverlap(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Joins open ways (arrays of {lat, lon}) into closed rings, matching ends exactly. */
export function assembleRings(ways) {
  const key = (p) => `${p.lat},${p.lon}`;
  const pool = ways.filter((w) => w.length >= 2).map((w) => w.slice());
  const rings = [];
  while (pool.length) {
    let ring = pool.shift();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 10000) {
      const end = key(ring[ring.length - 1]);
      const i = pool.findIndex((w) => key(w[0]) === end || key(w[w.length - 1]) === end);
      if (i < 0) break;
      const [next] = pool.splice(i, 1);
      ring = ring.concat(key(next[0]) === end ? next.slice(1) : next.slice(0, -1).reverse());
    }
    if (ring.length >= 4 && key(ring[0]) === key(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

// ───────────────────────────────────────────────────────────── encoding

/**
 * Integer coordinates in steps of `q` metres, the first point absolute and the others as
 * differences: [x0, y0, dx1, dy1, …]. Repeated points are dropped.
 */
export function encodePoints(points, q) {
  const out = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i < points.length; i++) {
    const x = Math.round(points[i][0] / q);
    const y = Math.round(points[i][1] / q);
    if (i > 0 && x === px && y === py) continue;
    if (i === 0) out.push(x, y);
    else out.push(x - px, y - py);
    px = x;
    py = y;
  }
  return out;
}

export function writeOut(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  const text = JSON.stringify(data);
  fs.writeFileSync(file, text);
  console.log(`  ${path.relative(ROOT, file)}: ${(text.length / 1024).toFixed(0)} KB`);
}

// ───────────────────────────────────────────────────────────── downloads

/** Downloads `url` once into the cache and returns the local path. */
export async function cachedDownload(url, name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  console.log(`  scarico ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'dieci-geodata/1.0 (one-off script)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const tmp = `${file}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, file);
  return file;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
