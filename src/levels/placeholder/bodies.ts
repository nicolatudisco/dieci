/**
 * The bodies that more than one placeholder draws: the Earth and the Sun (now in ../sun.ts). They are always
 * on their stage anchor and at their true size, so two neighbouring levels draw them in
 * exactly the same place and the hand-over between them cannot be seen.
 */
import { Color } from 'three';
import { ANCHORS, EARTH_RADIUS, type Vec3 } from '../../engine/stage.ts';
import type { Sketch } from './sketch.ts';

/** Unit vector from the Earth to the Sun on screen: where the daylight comes from. */
const toSun = [ANCHORS.sun[0] - ANCHORS.earth[0], ANCHORS.sun[1] - ANCHORS.earth[1]] as const;
const toSunLength = Math.hypot(toSun[0], toSun[1]);
export const SUNLIGHT: readonly [number, number] = [toSun[0] / toSunLength, toSun[1] / toSunLength];

/** A CSS colour as linear RGB, for points of light. */
export function rgb(color: string): readonly [number, number, number] {
  const c = new Color(color);
  return [c.r, c.g, c.b];
}

/** The Earth at night, with the thin blue line of the air and the limb that faces the Sun lit. */
export function drawEarth(s: Sketch): Vec3 {
  const at = s.local(ANCHORS.earth);
  const r = s.units(EARTH_RADIUS);
  s.shape({ kind: 'ellipse', half: [r * 1.03, r * 1.03], color: '#3f7fe6', opacity: 0.6, soft: r * 0.07, additive: true }, at);
  s.shape({ kind: 'ellipse', half: [r, r], color: '#0a1736', rim: { color: '#b8d4ff', width: r * 0.12, light: SUNLIGHT, strength: 0.85 } }, at);
  // A hint of the day side near the limb that faces the Sun; the middle, where she is,
  // stays in the night. (The mask is centred on the origin of the level: every level that
  // draws the Earth has it there.)
  const day: Vec3 = [at[0] + SUNLIGHT[0] * r * 0.9, at[1] + SUNLIGHT[1] * r * 0.9, at[2]];
  s.shape({ kind: 'ellipse', half: [r * 0.3, r * 0.3], color: '#2a62c4', opacity: 0.5, soft: r * 0.6, mask: [r * 0.97, r] }, day);
  return at;
}

/** The Sun lives in ../sun.ts (M3): every level that draws it shares the same one. */
export { drawSun } from '../sun.ts';
