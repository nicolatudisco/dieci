/**
 * The stop `toscana`: a hundred kilometres, from Florence to the sea along the valley of
 * the Arno, at night as a satellite sees it.
 *
 * - The lights are NASA Black Marble (public/data/night-toscana.webp), in the same warm
 *   colour as the streets of `firenze`: the town melts into its own patch of light.
 * - The land a shade lighter than the sea, a thin cool coastline (Natural Earth), the
 *   outline of Tuscany just hinted at.
 * - The Arno from OpenStreetMap, all of it, from Florence to the sea at Pisa; the motorways
 *   barely there.
 * - Virgo at Cascina: its two arms, 3 km each, at true size and in their true directions
 *   (with a minimum width in pixels, so that the L can be seen).
 * - Light labels: Firenze, Pisa (where Galileo was born), Virgo.
 *
 * Units: tens of kilometres. Origin: «Tu sei qui».
 */
import { LABELS } from '../content/labels.ts';
import type { Vec3 } from '../engine/stage.ts';
import { WATER } from './geo/city.ts';
import { makeAreas, makeLines, makeNight, setClass } from './geo/layers.ts';
import { geoSketch } from './geo/level.ts';
import { loadGeo, loadNight } from './geo/load.ts';

/** The colours of the ground seen from space (also used by `italia`). */
export const LAND = '#0b0e19';
export const COAST = '#3d5290';
/** How much of the satellite lights is shown at exponent `e` (also used by `italia`). */
export function nightFromAfar(e: number): number {
  const t = Math.min(1, Math.max(0, (e - 4.45) / 0.55));
  return t * t * (3 - 2 * t);
}

export const NIGHT_STYLE = { floor: 0.06, gamma: 1.7, dim: '#a85c27', bright: '#f7cf98', opacity: 0.78 } as const;

export default geoSketch(async (s) => {
  const [data, night] = await Promise.all([loadGeo('toscana.json'), loadNight('toscana')]);
  const u = s.unit;
  // The picture of the lights is the smallest: everything melts away before its edge.
  const [x0, y0, x1, y1] = night.box;
  s.mask([x0 + 15e3, y0 + 15e3, x1 - 15e3, y1 - 15e3], 45e3);

  const land = makeAreas(data.areas.land ?? [], u, s.geo);
  setClass(land.palette, 0, LAND);
  s.add(land.mesh);
  const lakes = makeAreas(data.areas.lake ?? [], u, s.geo);
  setClass(lakes.palette, 0, WATER);
  s.add(lakes.mesh);

  s.own(night.texture);
  const lights = makeNight(night.texture, night.box, u, s.geo, NIGHT_STYLE);
  s.add(lights.mesh);
  // The lights seen from a satellite belong to the scale of the region: closer, enlarged,
  // they would cover the streets of `firenze` with a blur.
  s.every((frame) => lights.setOpacity(NIGHT_STYLE.opacity * nightFromAfar(frame.e)));

  const coast = makeLines(data.lines.coast ?? [], u, { minPx: 1, opacity: 0.75 }, s.geo);
  setClass(coast.palette, 0, COAST);
  s.add(coast.mesh);
  const region = makeLines(data.lines.region ?? [], u, { minPx: 1, opacity: 0.3 }, s.geo);
  setClass(region.palette, 0, '#8fa3e6');
  s.add(region.mesh);
  const roads = makeLines(data.lines.road ?? [], u, { minPx: 0.8, opacity: 0.35 }, s.geo);
  setClass(roads.palette, 0, '#d08a45');
  setClass(roads.palette, 1, '#d08a45', 0.7);
  s.add(roads.mesh);
  const arno = makeLines(data.lines.arno ?? [], u, { minPx: 1.6, defaultWidth: 60 }, s.geo);
  setClass(arno.palette, 0, '#2d63b4');
  s.add(arno.mesh);

  // Virgo: the vertex and the two arms, 3 km each.
  const p = data.points;
  const at = (q: readonly [number, number] | undefined): Vec3 => [(q?.[0] ?? 0) / u, (q?.[1] ?? 0) / u, 0];
  const virgo = p.virgo;
  if (virgo && p.virgoNorth && p.virgoWest) {
    const arms = makeLines(
      [p.virgoNorth, p.virgoWest].map((end) => ({ cls: 0, width: 0, points: new Float64Array([virgo[0], virgo[1], end[0], end[1]]) })),
      u,
      { minPx: 2.2 },
      s.geo,
    );
    setClass(arms.palette, 0, '#c4d3ff');
    s.add(arms.mesh);
    s.label({ id: 'virgo', text: LABELS.places.virgo, at: at(virgo), kind: 'place', align: 'below', from: 4.4, to: 5.5 });
  }
  s.label({ id: 'firenze', text: LABELS.places.florence, at: at(p.firenze), kind: 'place', align: 'right', from: 4.4, to: 5.6 });
  s.label({ id: 'pisa', text: LABELS.places.pisa, at: at(p.pisa), kind: 'place', align: 'above', from: 4.4, to: 5.5 });
});
