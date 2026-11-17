/**
 * Where stars are born: a few thousand light-years around the Sun, which is now one star
 * among many.
 *
 * - The field of stars (src/levels/nebula.ts): always about as many on screen, the brightest
 *   staying while the view widens. None inside the bubble: there only the real stars of `bolla`.
 * - The real clouds around the Sun (content/cosmos.ts → NEBULAE), each in its true direction
 *   and at its true distance: dark dust that hides the stars behind it, pink glowing gas,
 *   blue dust lit by stars, the faint pink rings of bubbles blown by old stars. Together they
 *   ring the Sun at a few hundred light-years (the edge of the Local Bubble, not named).
 * - The Orion Nebula is only a few pixels wide: its lens shows it as photographs do.
 * - Behind, the faint glow of the disc of the galaxy (the level of `via-lattea`).
 *
 * Units: hundreds of light-years, around the Sun.
 */
import { NEBULAE } from '../content/cosmos.ts';
import { LABELS } from '../content/labels.ts';
import { ANCHORS, LY } from '../engine/stage.ts';
import type { Vec3 } from '../engine/stage.ts';
import { makeNebula, makeStarField, orionLens, type Cloud } from './nebula.ts';
import { sketch } from './placeholder/sketch.ts';
import { stageFromGalactic } from './sky.ts';

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Back to front: the dark dust, the rings, then the glowing clouds. */
const LAYER = { dark: 10, shell: 11, reflection: 12, emission: 13 } as const;

export default sketch((s) => {
  const perLy = s.units(LY);
  const sun = s.local(ANCHORS.sun);

  // The bubble of the real stars: no invented star within 30 light-years.
  const field = makeStarField(30 * perLy);
  field.mesh.renderOrder = 1;
  s.scene.add(field.mesh);

  const clouds: Cloud[] = [];
  NEBULAE.forEach((nebula, i) => {
    const cloud = makeNebula(nebula, nebula.radius * perLy, 3 + i * 7.31);
    const [x, y] = stageFromGalactic(nebula.l, nebula.ly * perLy);
    cloud.mesh.position.set(sun[0] + x, sun[1] + y, sun[2]);
    cloud.mesh.renderOrder = LAYER[nebula.kind];
    s.scene.add(cloud.mesh);
    clouds.push(cloud);
  });

  // The Orion Nebula: its anchor is the stage anchor.
  const orion: Vec3 = s.local(ANCHORS.orionNebula);
  s.lens({ id: 'orion', at: orion, scene: orionLens(), fieldWidth: 2.2, angle: -40, label: LABELS.places.orionNebula, from: 18.95, to: 19.95 });

  s.tick = (frame) => {
    const camera = frame.camera.position;
    // The stars give way to the glow of the galaxy as the view widens.
    const stars = frame.fade * (1 - smoothstep(20, 20.55, frame.e));
    field.update(camera.x, camera.y, frame.viewWidth, stars, frame.time, frame.pixelRatio, frame.quality);
    for (const cloud of clouds) cloud.update(frame.pxPerUnit, frame.fade);
  };
});
