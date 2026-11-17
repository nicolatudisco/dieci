/**
 * The cosmic web: billions of light-years, galaxies along filaments around empty voids. It is
 * the same web as Laniakea's (src/cosmic-web.ts): one galaxy for every bit of matter of the
 * whole tile, 10 billion light-years wide, around us. Laniakea, small now, keeps its edge and
 * its name for a while (its own level): it is one cell of the web.
 *
 * - Every point is a whole galaxy (the text says so): brighter in the knots and filaments.
 * - Depth: two farther slices of the web, fainter, slowly turning in opposite directions;
 *   while the zoom moves they also slide at their own pace (they are farther away).
 * - Widening towards the whole universe the galaxies dim, so that their light per area stays
 *   the same, and give way to the picture of the same web in `universo`.
 *
 * Units: billions of light-years, around us.
 */
import { Group } from 'three';
import { LY } from '../engine/stage.ts';
import { asyncSketch } from './async-sketch.ts';
import { makeGalaxyPoints } from './web-draw.ts';
import { webData } from './web-data.ts';

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The farther slices: depth (billions of light-years behind), how they are turned, how bright, how fast they turn (radians a second). */
const SLICES = [
  { depth: 1.6, turn: Math.PI / 2, level: 0.5, spin: 0.0016 },
  { depth: 3.4, turn: Math.PI, level: 0.3, spin: -0.0011 },
] as const;

export default asyncSketch(async (s) => {
  const data = await webData();
  const perMly = s.units(1e6 * LY);
  const toLocal = (x: number, y: number): readonly [number, number] => [x * perMly, y * perMly];

  const web = makeGalaxyPoints(data.web, toLocal);
  web.points.renderOrder = 3;
  s.scene.add(web.points);

  // The farther slices: the same galaxies, turned (another slice of the same kind of web), set back.
  const slices = SLICES.map((slice, i) => {
    const group = new Group();
    const points = makeGalaxyPoints(data.web, toLocal, 0);
    group.add(points.points);
    group.position.z = -slice.depth;
    group.rotation.z = slice.turn;
    group.renderOrder = 1 + i;
    points.points.renderOrder = 1 + i;
    s.scene.add(group);
    return { ...slice, group, points };
  });

  s.every((frame) => {
    const e = frame.e;
    // Wider than the stop the galaxies dim, so that their light per area stays the same.
    const wide = e <= s.exponent ? 1 : 10 ** (-1.7 * (e - s.exponent));
    const largo = frame.pxPerUnit * frame.viewWidth;
    // A small screen holds fewer galaxies, each a little fainter: the same light per area.
    const room = Math.min(1, Math.max(0.25, (largo / 820) ** 1.4)) * frame.quality;
    const small = Math.min(1, Math.max(0.4, (largo / 820) ** 0.6));
    web.update(0.55 * small * frame.fade * wide, 1.35, room, frame.pixelRatio);
    // The slices come in after Laniakea and leave before the whole universe is in view.
    const depth = smoothstep(25.15, 25.5, e) * (1 - smoothstep(25.85, 26.2, e));
    const time = frame.isStatic || s.ctx.reducedMotion ? 0 : frame.time;
    for (const slice of slices) {
      slice.group.rotation.z = slice.turn + slice.spin * time;
      // Every third galaxy is enough at that distance.
      slice.points.update(0.55 * small * slice.level * frame.fade * depth * wide, 1.15, room / 3, frame.pixelRatio);
    }
  });
});
