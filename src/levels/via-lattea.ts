/**
 * The Milky Way, seen from above its north pole: a barred spiral 100,000 light-years
 * across, with the Sun on the Local Arm (src/levels/galaxy.ts, content/cosmos.ts).
 *
 * - The galaxy is in the scene from the nebulae on, as the faint glow of the disc around the
 *   Sun: the brightness of a surface does not change with distance, so close up it is a
 *   gentle glow and its arms come out as the view widens.
 * - It is drawn at full strength until the level leaves: `andromeda` draws the same galaxy
 *   in the same place with MAX blending, so the hand-over cannot be seen.
 * - A few thousand stars sparkle on the arms while the galaxy is large on screen; never
 *   near the Sun, where the real neighbourhood of `nebulose` is.
 *
 * Units: tens of thousands of light-years, around the galactic centre.
 */
import { MILKY_WAY } from '../content/cosmos.ts';
import { LY } from '../engine/stage.ts';
import { armStars, makeGalaxy, milkyWayLook } from './galaxy.ts';
import { mulberry32 } from './placeholder/primitives.ts';
import { sketch } from './placeholder/sketch.ts';

const STARS = 3200;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Before this point of the journey the galaxy follows the fade of the level; after it, it stays full. */
export const MILKY_WAY_FULL_FROM = 20.5;

export default sketch((s) => {
  const radius = s.units(MILKY_WAY.radiusLy * LY);
  const look = milkyWayLook(radius);
  const galaxy = makeGalaxy(look);
  galaxy.mesh.renderOrder = 1;
  s.scene.add(galaxy.mesh);

  // The stars that sparkle: blue-white on the arms, a few creamy ones.
  const sun: readonly [number, number] = [look.hole[0], look.hole[1]];
  const places = armStars(look, STARS, 2121, [sun[0], sun[1], 0.07]);
  const count = places.length / 2;
  const random = mulberry32(77);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (places[i * 2] ?? 0) * radius;
    positions[i * 3 + 1] = (places[i * 2 + 1] ?? 0) * radius;
    const bright = random() ** 3;
    sizes[i] = 1.3 + 2.2 * bright;
    const cream = random() < 0.15;
    const level = 0.3 + 0.5 * bright;
    colors.set(cream ? [level, level * 0.9, level * 0.75] : [level * 0.75, level * 0.85, level], i * 3);
    phases[i] = random();
  }
  const stars = s.dots({ positions, sizes, colors, phases }, { adaptive: true });

  s.tick = (frame) => {
    // Close up, the light of the disc is the stars of `nebulose`, one by one: the smooth glow
    // stands for the stars too far to be told apart, so it is faint until the view is wide.
    const unresolved = 0.16 + 0.84 * smoothstep(19.7, 20.9, frame.e);
    // Until `andromeda` draws the same galaxy (M5, step 4), it follows the fade of the level.
    const strength = frame.u > MILKY_WAY_FULL_FROM && frame.u < 21.5 ? 1 : frame.fade;
    galaxy.update(frame.pxPerUnit, strength * unresolved);
    // The stars only while the galaxy is large on screen, and not from too close.
    const radiusPx = radius * frame.pxPerUnit;
    const shown = smoothstep(130, 280, radiusPx) * (1 - smoothstep(2600, 5200, radiusPx));
    stars.visible = shown > 0.01;
    const material = stars.material as { uniforms?: Record<string, { value: unknown }> };
    if (material.uniforms?.uOpacity) material.uniforms.uOpacity.value = shown;
  };
});
