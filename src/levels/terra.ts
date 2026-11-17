/**
 * The stop `terra`: the whole Earth, about 12,700 km across, with Italy in the middle at
 * night, where the journey has just come from, and a crescent of day on the side of the Sun.
 * The globe is in earth.ts (shared with `luna`).
 *
 * Units: thousands of kilometres. Origin: the centre of the Earth.
 */
import { asyncSketch } from './async-sketch.ts';
import { addGlobe } from './earth.ts';

export default asyncSketch(async (s) => {
  await addGlobe(s);
});
