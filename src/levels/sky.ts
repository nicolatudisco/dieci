/**
 * From the coordinates of the astronomers to the axes of the stage.
 *
 * The stage draws the neighbourhood of the Sun as seen from above the plane of the Milky
 * Way (from the north galactic pole): the galactic centre is straight up on screen and
 * galactic longitude grows counter-clockwise (see CLAUDE.md, «Contratto dei livelli»).
 * Distances are kept in three dimensions: +z is towards the camera.
 */

const RAD = Math.PI / 180;

/** Unit vector in galactic axes (x to the galactic centre, y to longitude 90°, z to the north pole). */
export function galacticFromEquatorial(raHours: number, decDeg: number): readonly [number, number, number] {
  const ra = raHours * 15 * RAD;
  const dec = decDeg * RAD;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  // Rotation from equatorial J2000 to galactic coordinates (IAU 1958 system, J2000 values).
  return [
    -0.0548755604 * x - 0.8734370902 * y - 0.4838350155 * z,
    0.4941094279 * x - 0.44482963 * y + 0.7469822445 * z,
    -0.867666149 * x - 0.1980763734 * y + 0.4559837762 * z,
  ];
}

/** Galactic longitude and latitude in degrees. */
export function galacticLonLat(raHours: number, decDeg: number): { lon: number; lat: number } {
  const [x, y, z] = galacticFromEquatorial(raHours, decDeg);
  return { lon: (Math.atan2(y, x) / RAD + 360) % 360, lat: Math.asin(Math.max(-1, Math.min(1, z))) / RAD };
}

/**
 * Where a star at `distance` is, relative to the Sun, in the axes of the stage
 * (same unit as `distance`): x to the right, y up (towards the galactic centre), z to the camera.
 */
export function stageFromEquatorial(raHours: number, decDeg: number, distance: number): readonly [number, number, number] {
  const [gx, gy, gz] = galacticFromEquatorial(raHours, decDeg);
  return [-gy * distance, gx * distance, gz * distance];
}

/**
 * Where something at galactic longitude `lDeg` and `distance` is drawn, relative to the
 * Sun, on the plane of the stage (same unit as `distance`). Like the stars of the bubble
 * (Nicola's choice in M4) it keeps the TRUE DIRECTION along the galactic plane and the TRUE
 * DISTANCE; what is flattened is the height above or below the plane.
 */
export function stageFromGalactic(lDeg: number, distance: number): readonly [number, number] {
  const l = lDeg * RAD;
  return [-Math.sin(l) * distance, Math.cos(l) * distance];
}
