/**
 * The stop `italia`: the whole of Italy at night, seen from space.
 *
 * - The lights are NASA Black Marble (public/data/night-italia.webp), the same picture and
 *   the same colours as `toscana`: the cities like constellations.
 * - The land a shade lighter than the sea, thin cool coasts, the borders barely there
 *   (Natural Earth); Tuscany just highlighted, with a faint veil and outline.
 * - The International Space Station: a point of light crossing the scene with a thin trail,
 *   along a plausible ground track (an orbit inclined 51.6°, computed by the geodata script)
 *   at its true speed over the ground, about 7.2 km a second. With ?static=1 it stands still.
 * - The edge is round and soft: zooming out, the map melts into the globe of `terra`.
 *
 * Units: hundreds of kilometres. Origin: «Tu sei qui».
 */
import { InstancedBufferAttribute } from 'three';
import { LABELS } from '../content/labels.ts';
import type { LabelSpec, LevelFrame } from '../engine/level.ts';
import { WATER } from './geo/city.ts';
import { makeAreas, makeLights, makeLines, makeNight, setClass, type LineLayer } from './geo/layers.ts';
import { geoSketch } from './geo/level.ts';
import { loadGeo, loadNight } from './geo/load.ts';
import { COAST, LAND, NIGHT_STYLE } from './toscana.ts';

/** Where the view is centred at the stop (stage.ts), metres: the round edge is around it. */
const CENTRE: readonly [number, number] = [100e3, -210e3];

/** Speed of the point under the station, metres per second (7.66 km/s at 400 km of height). */
const ISS_GROUND_SPEED = 7.2e3;
/** Length of the trail behind it, metres, in this many pieces. */
const TRAIL = 520e3;
const TRAIL_PIECES = 16;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** A polyline with the distance along it, to place a point at any distance. */
function walker(points: Float64Array): { length: number; at: (s: number) => [number, number] } {
  const n = points.length / 2;
  const cumulative = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    cumulative[i] = (cumulative[i - 1] ?? 0) + Math.hypot((points[2 * i] ?? 0) - (points[2 * i - 2] ?? 0), (points[2 * i + 1] ?? 0) - (points[2 * i - 1] ?? 0));
  }
  const length = cumulative[n - 1] ?? 0;
  return {
    length,
    at: (s) => {
      const d = Math.min(length, Math.max(0, s));
      let i = 1;
      while (i < n - 1 && (cumulative[i] ?? 0) < d) i++;
      const a = cumulative[i - 1] ?? 0;
      const b = cumulative[i] ?? a;
      const t = b > a ? (d - a) / (b - a) : 0;
      return [(points[2 * i - 2] ?? 0) + t * ((points[2 * i] ?? 0) - (points[2 * i - 2] ?? 0)), (points[2 * i - 1] ?? 0) + t * ((points[2 * i + 1] ?? 0) - (points[2 * i - 1] ?? 0))];
    },
  };
}

/** Moves the segments of a line layer: piece k from a[k] to b[k], in metres. */
function moveSegments(layer: LineLayer, unit: number, ends: readonly (readonly [number, number])[]): void {
  const geometry = layer.mesh.geometry;
  const a = geometry.getAttribute('aA') as InstancedBufferAttribute;
  const b = geometry.getAttribute('aB') as InstancedBufferAttribute;
  for (let k = 0; k + 1 < ends.length && k < a.count; k++) {
    const p = ends[k] ?? [0, 0];
    const q = ends[k + 1] ?? p;
    a.setXY(k, p[0] / unit, p[1] / unit);
    b.setXY(k, q[0] / unit, q[1] / unit);
  }
  a.needsUpdate = true;
  b.needsUpdate = true;
}

export default geoSketch(async (s) => {
  const [data, night] = await Promise.all([loadGeo('italia.json'), loadNight('italia')]);
  const u = s.unit;
  s.mask(data.box, 200e3);
  s.roundMask(CENTRE, 1250e3, 1650e3);

  const land = makeAreas(data.areas.land ?? [], u, s.geo);
  setClass(land.palette, 0, LAND);
  s.add(land.mesh);
  const lakes = makeAreas(data.areas.lake ?? [], u, s.geo);
  setClass(lakes.palette, 0, WATER);
  s.add(lakes.mesh);
  // Tuscany, just highlighted.
  const tuscany = makeAreas(data.areas.region ?? [], u, s.geo);
  setClass(tuscany.palette, 0, '#151c3a');
  s.add(tuscany.mesh);

  s.own(night.texture);
  s.add(makeNight(night.texture, night.box, u, s.geo, NIGHT_STYLE).mesh);

  const coast = makeLines(data.lines.coast ?? [], u, { minPx: 1, opacity: 0.7 }, s.geo);
  setClass(coast.palette, 0, COAST);
  s.add(coast.mesh);
  const borders = makeLines(data.lines.border ?? [], u, { minPx: 0.8, opacity: 0.3 }, s.geo);
  setClass(borders.palette, 0, '#5d6aa0');
  s.add(borders.mesh);
  const outline = makeLines(data.lines.region ?? [], u, { minPx: 1.1, opacity: 0.7 }, s.geo);
  setClass(outline.palette, 0, '#8fa3e6');
  s.add(outline.mesh);

  // The Space Station.
  const track = data.lines.iss?.[0]?.points;
  if (!track) return;
  const path = walker(track);
  // At rest it is a little before the middle of the view, coming up from the south-west.
  const restAt = (() => {
    let best = 0;
    let bestD = Infinity;
    for (let d = 0; d <= path.length; d += 10e3) {
      const [x, y] = path.at(d);
      const dist = Math.hypot(x - CENTRE[0] + 260e3, y - CENTRE[1] + 120e3);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  })();
  const ground = makeLines([{ cls: 0, width: 0, points: track }], u, { minPx: 0.8, opacity: 0.18 }, s.geo);
  setClass(ground.palette, 0, '#b8c8ff');
  s.add(ground.mesh);
  const trail = makeLines(
    Array.from({ length: TRAIL_PIECES }, (_, k) => ({ cls: k, width: 0, points: new Float64Array(4) })),
    u,
    { minPx: 1.4 },
    s.geo,
  );
  for (let k = 0; k < TRAIL_PIECES; k++) setClass(trail.palette, k, '#dbe4ff', ((k + 1) / TRAIL_PIECES) ** 1.6);
  s.add(trail.mesh);
  const glow = makeLights([{ x: 0, y: 0, radius: 18e3, cls: 0 }], u, { minPx: 14, soft: 1, additive: true, opacity: 0.55 }, s.geo);
  setClass(glow.palette, 0, '#9fb6ff');
  s.add(glow.mesh);
  const dot = makeLights([{ x: 0, y: 0, radius: 60, cls: 0 }], u, { minPx: 4, soft: 0 }, s.geo);
  setClass(dot.palette, 0, '#f4f7ff');
  s.add(dot.mesh);

  let here: [number, number] = path.at(restAt);
  const place = (frame: LevelFrame): void => {
    // It loops along the pass: a new pass every few minutes, as if the Earth turned beneath.
    const loop = path.length + TRAIL;
    const d = (restAt + ISS_GROUND_SPEED * frame.time) % loop;
    here = path.at(d);
    const ends: [number, number][] = [];
    for (let k = 0; k <= TRAIL_PIECES; k++) ends.push(path.at(d - TRAIL * (1 - k / TRAIL_PIECES)));
    moveSegments(trail, u, ends);
    moveSegments(dot, u, [here, here]);
    moveSegments(glow, u, [here, here]);
    const show = d <= path.length ? 1 : 0;
    dot.setOpacity(show);
    glow.setOpacity(0.55 * show);
  };
  s.every(place);
  s.liveLabels = (frame: LevelFrame): readonly LabelSpec[] => {
    const opacity = smoothstep(5.5, 5.8, frame.e) * (1 - smoothstep(6.6, 6.9, frame.e));
    if (opacity < 0.01) return [];
    return [{ id: 'iss', text: LABELS.places.iss, at: [here[0] / u, here[1] / u, 0], opacity, kind: 'note', align: 'right' }];
  };
});
