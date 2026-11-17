/**
 * The street of the first two scenes, measured on OpenStreetMap (src/content/street.ts).
 *
 * The picture of her on the doorstep (doorstep.ts) is drawn with the door straight up (+y).
 * The real street runs at an angle: `partenza` and `strada` turn their picture so that the
 * door and the kerb lie as they do in reality, and the map of `rifredi`, which keeps north
 * up, continues them without a jump.
 *
 * The turn happens gently during the first zoom (option B, chosen by Nicola): at 1 m she
 * sits upright as in the picture; by the time the street enters the frame it lies along the
 * real one. (Option A, the picture turned from the start, put her hands and feet out of the
 * metre.)
 */
import { STREET } from '../content/street.ts';

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** The two normals of the street axis; the one that points from the street to her. */
const axis = rad(STREET.angle);
const normal: readonly [number, number] = (() => {
  const n: [number, number] = [-Math.sin(axis), Math.cos(axis)];
  const towardsHer = -(STREET.centre[0] * n[0] + STREET.centre[1] * n[1]);
  return towardsHer >= 0 ? n : [-n[0], -n[1]];
})();

/** Distance from her to the centre line of the carriageway, in metres. */
export const STREET_DISTANCE = Math.abs(STREET.centre[0] * normal[0] + STREET.centre[1] * normal[1]);

/** Distance from her to the kerb: the near edge of the carriageway (parking lanes included). */
export const KERB_DISTANCE = STREET_DISTANCE - STREET.width / 2;

export const STREET_WIDTH = STREET.width;

/** Rotation (radians, counter-clockwise) that turns the picture (door up) to the real street. */
export const STREET_TURN = Math.atan2(normal[1], normal[0]) - Math.PI / 2;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How much the picture is turned at exponent `e`: done before the map of `rifredi` appears. */
export function streetTurn(e: number): number {
  return STREET_TURN * smoothstep(0.1, 0.75, e);
}
