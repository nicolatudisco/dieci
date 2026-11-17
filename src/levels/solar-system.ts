/**
 * The planets, for every level that draws them. Shared so that neighbouring levels agree:
 * a planet is in the same place in `sole`, `giove` and `pianeti-lontani`.
 *
 * - `au`: semi-major axis of the orbit in astronomical units (NASA planetary fact sheets,
 *   rounded). Orbits are drawn as circles around the Sun: a simplification that is invisible
 *   at these scales.
 * - `angle`: where the planet is along its orbit ON SCREEN, in degrees (0 = right, 90 = up).
 *   A composition choice, not an ephemeris, except for the Earth, whose place is fixed by
 *   the stage anchors (the Sun is at 25° from the Earth, so the Earth is at 205° from the Sun).
 */
export interface Planet {
  readonly id: string;
  /** Italian name, as shown to the child. */
  readonly name: string;
  readonly au: number;
  readonly angle: number;
  /** Colour of its point of light. */
  readonly color: string;
}

export const PLANETS: readonly Planet[] = [
  { id: 'mercury', name: 'Mercurio', au: 0.387, angle: 118, color: '#b9b4ad' },
  { id: 'venus', name: 'Venere', au: 0.723, angle: 325, color: '#efe2bd' },
  { id: 'earth', name: 'Terra', au: 1, angle: 205, color: '#9fc3ff' },
  { id: 'mars', name: 'Marte', au: 1.524, angle: 40, color: '#e8a583' },
  { id: 'jupiter', name: 'Giove', au: 5.2, angle: 140, color: '#e9d3ad' },
  { id: 'saturn', name: 'Saturno', au: 9.57, angle: 18, color: '#e6d49c' },
  { id: 'uranus', name: 'Urano', au: 19.2, angle: 235, color: '#b5e3ea' },
  { id: 'neptune', name: 'Nettuno', au: 30.1, angle: 165, color: '#8fa9ff' },
];

/** Radius of the Sun in astronomical units (695,700 km). */
export const SUN_RADIUS_AU = 695_700_000 / 149_597_870_700;

export function planet(id: string): Planet {
  const found = PLANETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown planet: ${id}`);
  return found;
}

/** Position of a planet relative to the Sun, in astronomical units, in screen axes. */
export function planetPosition(p: Planet): readonly [number, number] {
  const a = (p.angle * Math.PI) / 180;
  return [p.au * Math.cos(a), p.au * Math.sin(a)];
}
