/**
 * The stop `firenze`: ten kilometres, the whole town at night (OpenStreetMap, city.json).
 *
 * - The Arno as a dark ribbon with a light on the water, the bridges a little brighter over
 *   it; the streets as warm threads, the residential ones quieter, and the glow of the city
 *   where they are dense; the railway.
 * - The Duomo: at this scale its true footprint is a few pixels, so a lens shows it from
 *   above, enlarged: the real outline from OpenStreetMap, the roofs, and the octagon of the
 *   dome with its eight white ribs and the lantern (where the bronze plate with the hole of
 *   Toscanelli is). Drawn by us, «ingrandito, non in scala».
 * - Light labels: Rifredi (next to the warm dot) and the Arno.
 *
 * Units: kilometres. Origin: «Tu sei qui».
 */
import { Color, Mesh, MeshBasicMaterial, Scene, Shape, ShapeGeometry, Vector2 } from 'three';
import { LABELS } from '../content/labels.ts';
import type { Vec3 } from '../engine/stage.ts';
import { drawCity } from './geo/city.ts';
import { geoSketch } from './geo/level.ts';
import { loadGeo } from './geo/load.ts';
import { makeShape, sharedUniforms, type ShapeOptions } from './placeholder/primitives.ts';

/** The view of the lens, metres across. */
const LENS_FIELD = 190;

/**
 * Where the dome is on the footprint: the octagon with its three tribunes is the widest part
 * of the plan. Returns the axis of the church (unit vector, towards the apse) and the centre
 * of the dome, both in metres.
 */
function domeOf(ring: Float64Array): { axis: [number, number]; centre: [number, number]; length: number } {
  const n = ring.length / 2;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += ring[2 * i] ?? 0;
    cy += ring[2 * i + 1] ?? 0;
  }
  cx /= n;
  cy /= n;
  // Principal axis of the outline.
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (ring[2 * i] ?? 0) - cx;
    const dy = (ring[2 * i + 1] ?? 0) - cy;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  let axis: [number, number] = [Math.cos(angle), Math.sin(angle)];
  // The apse is to the east.
  if (axis[0] < 0) axis = [-axis[0], -axis[1]];
  const along = (i: number): number => ((ring[2 * i] ?? 0) - cx) * axis[0] + ((ring[2 * i + 1] ?? 0) - cy) * axis[1];
  const across = (i: number): number => -((ring[2 * i] ?? 0) - cx) * axis[1] + ((ring[2 * i + 1] ?? 0) - cy) * axis[0];
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    lo = Math.min(lo, along(i));
    hi = Math.max(hi, along(i));
  }
  // Width of the plan in slices along the axis; the dome is the middle of the widest stretch.
  const slices = 60;
  const width = new Array<number>(slices).fill(0);
  for (let k = 0; k < slices; k++) {
    const t = lo + ((k + 0.5) / slices) * (hi - lo);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ai = along(i);
      const aj = along(j);
      if (ai > t !== aj > t) {
        const c = across(j) + ((across(i) - across(j)) * (t - aj)) / (ai - aj);
        min = Math.min(min, c);
        max = Math.max(max, c);
      }
    }
    width[k] = max > min ? max - min : 0;
  }
  const widest = Math.max(...width);
  let first = -1;
  let last = -1;
  width.forEach((w, k) => {
    if (w > widest * 0.85) {
      if (first < 0) first = k;
      last = k;
    }
  });
  const t = lo + ((first + last + 1) / 2 / slices) * (hi - lo);
  return { axis, centre: [cx + axis[0] * t, cy + axis[1] * t], length: hi - lo };
}

/**
 * The Duomo from above, in metres, with the dome at the origin. `middle` is the middle of
 * the whole plan in the same coordinates: the lens is centred there, so the church is whole.
 */
function duomoScene(ring: Float64Array): { scene: Scene; centre: [number, number]; middle: [number, number] } {
  const scene = new Scene();
  const { axis, centre } = domeOf(ring);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i] ?? 0);
    x1 = Math.max(x1, ring[i] ?? 0);
    y0 = Math.min(y0, ring[i + 1] ?? 0);
    y1 = Math.max(y1, ring[i + 1] ?? 0);
  }
  const middle: [number, number] = [(x0 + x1) / 2 - centre[0], (y0 + y1) / 2 - centre[1]];
  const shared = sharedUniforms();
  shared.uPixelRatio.value = 2;
  let order = 0;
  const shape = (options: ShapeOptions, x: number, y: number, degrees = 0): void => {
    const mesh = makeShape({ ...options, order: ++order }, shared);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = (degrees * Math.PI) / 180;
    scene.add(mesh);
  };
  // The square around it, lit at night.
  shape({ kind: 'ellipse', half: [120, 120], color: '#2a2630', soft: 90 }, middle[0], middle[1]);
  // The true outline: marble walls catching the floodlights, terracotta roofs inside.
  const outline = (inset: number, color: string): void => {
    const points: Vector2[] = [];
    for (let i = 0; i + 1 < ring.length; i += 2) {
      const x = (ring[i] ?? 0) - centre[0];
      const y = (ring[i + 1] ?? 0) - centre[1];
      const d = Math.hypot(x, y) || 1;
      points.push(new Vector2(x - (x / d) * inset, y - (y / d) * inset));
    }
    const mesh = new Mesh(new ShapeGeometry(new Shape(points)), new MeshBasicMaterial({ color: new Color(color), transparent: true, depthTest: false, depthWrite: false }));
    mesh.renderOrder = ++order;
    scene.add(mesh);
  };
  outline(0, '#d9cdb6');
  outline(2.2, '#7c3a2a');
  // The dome: an octagon of red tiles with eight white marble ribs, and the lantern on top.
  const turn = (Math.atan2(axis[1], axis[0]) * 180) / Math.PI;
  const R = 27;
  shape({ kind: 'ellipse', half: [R + 3, R + 3], color: '#000000', opacity: 0.35, soft: 6 }, 3, -3);
  const octagon = (r: number, color: string): void => {
    // Eight rotated boxes make an octagon well enough at this size.
    for (let k = 0; k < 4; k++) shape({ kind: 'box', half: [r * Math.cos(Math.PI / 8), r * Math.cos(Math.PI / 8) * Math.tan(Math.PI / 8)], color }, 0, 0, turn + 22.5 + k * 45);
    shape({ kind: 'ellipse', half: [r * 0.93, r * 0.93], color }, 0, 0);
  };
  octagon(R, '#a8513a');
  for (let k = 0; k < 8; k++) {
    const a = ((turn + 22.5 + k * 45) * Math.PI) / 180;
    const r = R * 0.98;
    shape({ kind: 'box', half: [r / 2, 0.9], color: '#efe6d4' }, (Math.cos(a) * r) / 2, (Math.sin(a) * r) / 2, turn + 22.5 + k * 45);
  }
  octagon(4.6, '#efe6d4');
  shape({ kind: 'ellipse', half: [2, 2], color: '#ffd27a' }, 0, 0);
  return { scene, centre, middle };
}

export default geoSketch(async (s) => {
  const city = await loadGeo('city.json');
  const [x0, y0, x1, y1] = city.box;
  s.mask([x0 + 300, y0 + 300, x1 - 300, y1 - 300], 2200);
  // A view of ten kilometres: tiles of five, a few draw calls instead of hundreds.
  await drawCity(s, city, { minPx: 0.9, thinDim: 0.7, glow: true, cell: 5000 });

  const at = (p: readonly [number, number] | undefined): Vec3 => [(p?.[0] ?? 0) / s.unit, (p?.[1] ?? 0) / s.unit, 0];
  s.label({ id: 'rifredi', text: LABELS.places.rifredi, at: [0, 0.35, 0], kind: 'place', align: 'above', from: 3.4, to: 4.5 });
  s.label({ id: 'arno', text: LABELS.places.arno, at: at(city.points.arno), kind: 'place', align: 'below', from: 3.5, to: 4.6 });

  const ring = city.areas.duomo?.[0]?.rings[0];
  if (ring) {
    const { scene, centre, middle } = duomoScene(ring);
    s.lens({ id: 'duomo', at: at(centre), scene, fieldWidth: LENS_FIELD, centre: middle, angle: -30, label: LABELS.places.duomo, from: 3.4, to: 4.5 });
  }
});
