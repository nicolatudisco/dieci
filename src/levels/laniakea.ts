/**
 * Laniakea, «immense sky»: our supercluster, as a piece of the cosmic web (src/cosmic-web.ts).
 *
 * - The galaxies are points along walls and filaments around emptier voids: about 100,000
 *   inside the edge, as the text says, and more sparsely around it.
 * - Laniakea is the region whose galaxies all flow towards the same place, the Great
 *   Attractor: faint flow lines slide towards it; outside the edge they flow elsewhere. The
 *   edge is the watershed, drawn as a soft band and a thin line.
 * - We are near the edge (the warm dot). No galaxy of the web within 6 million light-years
 *   of us: that is the Local Group of the stop before.
 * - Leaving for the cosmic web, the edge and its name stay a little longer: Laniakea is one
 *   cell of the web.
 *
 * Units: hundreds of millions of light-years, around the centre of Laniakea.
 */
import { WEB } from '../cosmic-web.ts';
import { LABELS } from '../content/labels.ts';
import { LY } from '../engine/stage.ts';
import { asyncSketch } from './async-sketch.ts';
import { makeEdge, makeFlowLines, makeGalaxyPoints } from './web-draw.ts';
import { webData } from './web-data.ts';

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default asyncSketch(async (s) => {
  const data = await webData();
  const perMly = s.units(1e6 * LY);
  const toLocal = (x: number, y: number): readonly [number, number] => [(x - WEB.centre[0]) * perMly, (y - WEB.centre[1]) * perMly];

  const fill = makeEdge(data.outline, toLocal, 0.16);
  fill.fill.renderOrder = 1;
  fill.band.renderOrder = 5;
  const around = makeGalaxyPoints(data.around, toLocal);
  around.points.renderOrder = 2;
  const inside = makeGalaxyPoints(data.laniakea, toLocal);
  inside.points.renderOrder = 3;
  const flows = makeFlowLines(data.flows, toLocal);
  flows.lines.renderOrder = 4;
  s.scene.add(fill.fill, around.points, inside.points, flows.lines, fill.band);

  // The name, above the highest point of the edge.
  let top = 0;
  for (let i = 1; i < data.outline.length / 2; i++) if (data.outline[i * 2 + 1]! > data.outline[top * 2 + 1]!) top = i;
  const [tx, ty] = toLocal(data.outline[top * 2]!, data.outline[top * 2 + 1]!);
  s.label({ id: 'laniakea', text: LABELS.places.laniakea, at: [tx, ty, 0], kind: 'title', align: 'above', from: 24.35, to: 25.7 });

  s.every((frame) => {
    const e = frame.e;
    // Wider and wider, the same galaxies would pile up into a blob: they dim as the view widens.
    const wide = e <= s.exponent ? 1 : 10 ** (-1.3 * (e - s.exponent));
    const largo = frame.pxPerUnit * frame.viewWidth;
    // A small screen holds fewer galaxies, each a little fainter: the same light per area.
    const room = Math.min(1, Math.max(0.25, (largo / 820) ** 1.4)) * frame.quality;
    const small = Math.min(1, Math.max(0.4, (largo / 820) ** 0.6));
    inside.update(0.5 * small * frame.fade * wide, 1.25, room, frame.pixelRatio);
    around.update(0.42 * small * frame.fade * wide, 1.45, Math.min(1, room * 1.3), frame.pixelRatio);
    const flowing = smoothstep(24.15, 24.55, e) * (1 - smoothstep(25.1, 25.4, e)) * frame.fade;
    flows.update(frame.isStatic ? 0 : frame.time, flowing, 0.12, 0.045);
    // The edge outlives the level's own fade: it is still there, small, inside the web.
    const edge = smoothstep(24, 24.4, e) * (1 - smoothstep(25.65, 25.95, e)) * (frame.u < s.exponent ? frame.fade : 1);
    fill.update(edge);
  });
});
