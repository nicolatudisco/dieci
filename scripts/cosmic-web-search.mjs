#!/usr/bin/env node
/**
 * Finds, once, where we are in the cosmic web of src/cosmic-web.ts: a seed of the random field
 * and the cell where our galaxy started, such that our basin of attraction (Laniakea) is about
 * 520 million light-years across, we are near its edge, inside a sheet or a filament (not a
 * void, not a big cluster), and the Great Attractor is a few hundred million light-years away.
 *
 *   node scripts/cosmic-web-search.mjs [firstSeed] [lastSeed]
 *
 * It prints the values to copy into WEB (seed, us, centre). Then `npm test` checks them
 * (tests/cosmic-web.test.ts).
 */
import { WEB, basins, distanceToOutline, findLaniakea, inside, makeField, sample, slid } from '../src/cosmic-web.ts';

const first = Number(process.argv[2] ?? 1);
const last = Number(process.argv[3] ?? 30);
const TARGET = 520;

let best = null;
for (let seed = first; seed <= last; seed++) {
  const field = makeField({ ...WEB, seed });
  const label = basins(field);
  const { n, cell } = field;
  const counts = new Map();
  for (const l of label) counts.set(l, (counts.get(l) ?? 0) + 1);
  // Basins whose area is about that of a disc 380–560 Mly across.
  const candidates = [...counts].filter(([, c]) => {
    const d = 2 * Math.sqrt((c * cell * cell) / Math.PI);
    return d > 360 && d < 560;
  });
  for (const [id] of candidates) {
    // Cells of the basin that might be us: try a sparse sample.
    const cells = [];
    for (let k = id % 7; k < n * n; k += 7) if (label[k] === id) cells.push(k);
    let probe = null;
    for (const k of cells) {
      const i = k % n;
      const j = Math.floor(k / n);
      const density = sample(field, field.density, i, j);
      if (density < 1.6 || density > 6) continue;
      probe = [i, j];
      break;
    }
    if (!probe) continue;
    const lan = findLaniakea(field, label, probe, WEB.attractorAngle);
    if (Math.abs(lan.width - TARGET) > 45) continue;
    // Now look for the best place for us in this basin: near the edge, in a sheet or filament.
    for (const k of cells) {
      const i = k % n;
      const j = Math.floor(k / n);
      const density = sample(field, field.density, i, j);
      if (density < 1.6 || density > 6) continue;
      const candidate = findLaniakea(field, label, [i, j], WEB.attractorAngle);
      // In stage coordinates we are at the origin.
      if (!inside(candidate.outline, 0, 0)) continue;
      const edge = distanceToOutline(candidate.outline, 0, 0);
      const toAttractor = Math.hypot(...candidate.attractor);
      if (edge < 15 || edge > 50 || toAttractor < 170 || toAttractor > 300) continue;
      // Not right on the edge of the frame: the centre of Laniakea should be about 230 Mly away.
      const toCentre = Math.hypot(...candidate.centroid);
      const score = Math.abs(candidate.width - TARGET) + 0.5 * Math.abs(toCentre - 230) + Math.abs(edge - 30) + 4 * Math.abs(density - 3);
      if (!best || score < best.score) {
        best = { score, seed, us: [i, j], width: candidate.width, edge, toAttractor, toCentre, density, centre: candidate.centroid, attractor: candidate.attractor };
        console.log(JSON.stringify(best));
      }
    }
  }
  console.log(`seed ${seed} done`);
}
if (best) {
  const [x, y] = slid(makeField({ ...WEB, seed: best.seed }), best.us[0] * (WEB.tile / WEB.grid), best.us[1] * (WEB.tile / WEB.grid));
  console.log(`\nWEB.seed = ${best.seed}\nWEB.us = [${best.us.join(', ')}]\nWEB.centre = [${best.centre.map((v) => v.toFixed(1)).join(', ')}]  (our galaxy at tile ${x.toFixed(1)}, ${y.toFixed(1)})`);
}
