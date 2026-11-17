/**
 * The stop `quartiere`: one kilometre of Rifredi at night (OpenStreetMap, city.json).
 *
 * - The network of the streets, the railway and the station of Rifredi.
 * - The area of the former Officine Galileo, the factory of scientific instruments of the
 *   text: on OpenStreetMap it is the «Ex Meccanotessile di Rifredi», also named «Ex Officine
 *   Galileo». A thin outline and a light label; no other place is marked.
 * - The view is centred south-east of her (stage.ts), so that she, the station and the whole
 *   area of the factory are inside the same kilometre: «Qui, per circa 70 anni…».
 * - Near her the lit windows of `rifredi` are still there, as a glitter.
 *
 * Units: kilometres. Origin: «Tu sei qui».
 */
import { LABELS } from '../content/labels.ts';
import type { Vec3 } from '../engine/stage.ts';
import { drawCity, drawNearLights } from './geo/city.ts';
import { makeAreas, makeLines, setClass } from './geo/layers.ts';
import { geoSketch } from './geo/level.ts';
import { loadGeo } from './geo/load.ts';
import { LINE_COLOR } from './placeholder/sketch.ts';

export default geoSketch(async (s) => {
  const [city, rifredi] = await Promise.all([loadGeo('city.json'), loadGeo('rifredi.json')]);
  const [x0, y0, x1, y1] = city.box;
  s.mask([x0 + 300, y0 + 300, x1 - 300, y1 - 300], 1500);
  await drawCity(s, city, { minPx: 1, thinDim: 0.45 });
  await drawNearLights(s, rifredi, false);

  const at = (p: readonly [number, number] | undefined): Vec3 => [(p?.[0] ?? 0) / s.unit, (p?.[1] ?? 0) / s.unit, 0];

  // The former Officine Galileo: a faint area with a thin cool outline.
  const officine = city.areas.officine ?? [];
  const fill = makeAreas(officine, s.unit, s.geo);
  setClass(fill.palette, 0, '#151b33');
  s.add(fill.mesh);
  const outline = makeLines(
    officine.map((a) => {
      const ring = a.rings[0] ?? new Float64Array();
      const closed = new Float64Array(ring.length + 2);
      closed.set(ring);
      closed[ring.length] = ring[0] ?? 0;
      closed[ring.length + 1] = ring[1] ?? 0;
      return { cls: 0, width: 0, points: closed };
    }),
    s.unit,
    { minPx: 1.3 },
    s.geo,
  );
  setClass(outline.palette, 0, LINE_COLOR, 0.85);
  s.add(outline.mesh);

  s.label({ id: 'officine', text: LABELS.places.officineGalileo, at: at(city.points.officine), kind: 'place', align: 'below', from: 2.5, to: 3.5 });
  s.label({ id: 'station', text: LABELS.places.station, at: at(city.points.station), kind: 'place', align: 'above', from: 2.5, to: 3.5 });
});
