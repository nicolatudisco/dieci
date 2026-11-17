/**
 * Shared by the scenes of space: the direction of the sunlight on screen, colours as linear
 * RGB, and the Sun (in ../sun.ts since M3; the Earth is ../earth.ts). They are always
 * on their stage anchor and at their true size, so two neighbouring levels draw them in
 * exactly the same place and the hand-over between them cannot be seen.
 */
import { Color } from 'three';
import { ANCHORS } from '../../engine/stage.ts';

/** Unit vector from the Earth to the Sun on screen: where the daylight comes from. */
const toSun = [ANCHORS.sun[0] - ANCHORS.earth[0], ANCHORS.sun[1] - ANCHORS.earth[1]] as const;
const toSunLength = Math.hypot(toSun[0], toSun[1]);
export const SUNLIGHT: readonly [number, number] = [toSun[0] / toSunLength, toSun[1] / toSunLength];

/** A CSS colour as linear RGB, for points of light. */
export function rgb(color: string): readonly [number, number, number] {
  const c = new Color(color);
  return [c.r, c.g, c.b];
}

/** The Sun lives in ../sun.ts (M3): every level that draws it shares the same one. */
export { drawSun } from '../sun.ts';
