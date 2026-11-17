/**
 * The stop `rifredi`: a hundred metres of the real streets of Rifredi at night, seen from
 * above (OpenStreetMap, public/data/rifredi.json).
 *
 * - The streets at their true width, asphalt with the pools of light of the lamps; from
 *   farther away the pools merge and the streets become warm threads (geo/city.ts).
 * - The railway towards the station, the Terzolle and the other waters, the dark green of
 *   the parks.
 * - Lit windows along the streets: made up, never tied to a building (geo/city-lights.ts).
 *   No house, school or private place is drawn or marked, and no street has a name.
 * - The street of `strada` continues here: same place, same width, same asphalt.
 *
 * Units: hundreds of metres. Origin: «Tu sei qui», on the edge of the pavement.
 */
import { drawCity, drawNearLights } from './geo/city.ts';
import { geoSketch } from './geo/level.ts';
import { loadGeo } from './geo/load.ts';

export default geoSketch(async (s) => {
  const data = await loadGeo('rifredi.json');
  // The data reach 2.2 km from her: they melt away before their edge.
  s.mask([-2100, -2100, 2100, 2100], 700);
  await drawCity(s, data, { minPx: 1.2, thinDim: 0 });
  await drawNearLights(s, data, true);
});
