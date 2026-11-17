/**
 * The stop `luna`: the Earth small in the middle (the same globe as `terra`), the orbit of
 * the Moon as a thin circle, 384,400 km across... in radius, and the Moon.
 *
 * - At true scale the Moon is a few pixels: the lens shows it, with its real picture (Solar
 *   System Scope), the face we always see from the Earth, lit by the same Sun as the Earth
 *   (EARTH_LIGHT): a crescent, with the faint glow of the night side.
 * - The route of Artemis II, barely hinted at: a figure of eight of small points from the
 *   Earth round the far side of the Moon and back. It is a sketch of the shape of a
 *   free-return trajectory (out on one side, home on the other, crossing in between), not
 *   the real path: in April 2026 the Moon was elsewhere on its orbit.
 *
 * Units: hundreds of thousands of kilometres. Origin: the centre of the Earth.
 */
import { Scene } from 'three';
import { LABELS } from '../content/labels.ts';
import { ANCHORS, MOON_DISTANCE, type Vec3 } from '../engine/stage.ts';
import { asyncSketch } from './async-sketch.ts';
import { EARTH_LIGHT, addGlobe } from './earth.ts';
import { rgb } from './placeholder/bodies.ts';
import { makeBody } from './planet-lens.ts';
import { acquire, loadColorTexture } from './textures.ts';

const MOON_RADIUS = 1_737_400;

/** The figure of eight: how far beyond the Earth and the Moon it turns, metres. */
const PERIGEE = 6_600e3;
const FAR_SIDE = 9_000e3;
const ROUTE_POINTS = 180;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A figure of eight (lemniscate of Gerono) stretched from the far side of the Earth to the
 * far side of the Moon; its two tips are rounded about as tightly as the turn round the Moon.
 */
function route(earth: Vec3, moon: Vec3, units: (m: number) => number): Vec3[] {
  const dx = moon[0] - earth[0];
  const dy = moon[1] - earth[1];
  const d = Math.hypot(dx, dy);
  const ux = dx / d;
  const uy = dy / d;
  const half = (d + units(PERIGEE) + units(FAR_SIDE)) / 2;
  const centre = d / 2 + (units(FAR_SIDE) - units(PERIGEE)) / 2;
  const width = Math.sqrt(units(FAR_SIDE) * half);
  const points: Vec3[] = [];
  for (let k = 0; k < ROUTE_POINTS; k++) {
    const t = (k / ROUTE_POINTS) * 2 * Math.PI;
    const along = centre + half * Math.cos(t);
    const across = width * Math.sin(t) * Math.cos(t);
    points.push([earth[0] + ux * along - uy * across, earth[1] + uy * along + ux * across, earth[2]]);
  }
  return points;
}

export default asyncSketch(async (s) => {
  const [earth, moonPicture] = await Promise.all([
    addGlobe(s),
    acquire('moon', () => loadColorTexture('textures/moon.webp'), (t) => t.dispose()),
  ]);
  s.onDispose(moonPicture.release);

  const moon = s.local(ANCHORS.moon);
  s.ring(earth, s.units(MOON_DISTANCE), { opacity: 0.42 });
  const r = s.units(MOON_RADIUS);
  s.shape({ kind: 'ellipse', half: [r, r], color: '#c9ccd8' }, moon);
  s.dot(moon, 5, [0.82, 0.84, 0.92], 0.9);

  // Artemis II, barely there: small points along the figure of eight.
  const path = route(earth, moon, (m) => s.units(m));
  const color = rgb('#b8c8ff');
  const positions = new Float32Array(path.length * 3);
  const sizes = new Float32Array(path.length).fill(2.2);
  const colors = new Float32Array(path.length * 3);
  const phases = new Float32Array(path.length);
  path.forEach((p, k) => {
    positions.set(p, k * 3);
    colors.set(color, k * 3);
    phases[k] = (k * 0.618) % 1;
  });
  const dots = s.dots({ positions, sizes, colors, phases }, { opacity: 0 });
  const material = dots.material as { uniforms?: { uOpacity?: { value: number } } };
  // Near the stop only: zooming in from the Earth it would be two long lines across nothing.
  s.every((frame) => {
    const shown = smoothstep(8.45, 8.8, frame.e) * (1 - smoothstep(9.5, 9.8, frame.e));
    if (material.uniforms?.uOpacity) material.uniforms.uOpacity.value = 0.55 * shown;
  });
  // The label on the half of the eight away from the lens, about a third of the way from the
  // Earth; only where the eight is long enough on screen (on a phone the lens takes the room).
  // (At t = 4.46 the eight is 37% of the way, on the side turned away from the lens.)
  const label = path[Math.round(ROUTE_POINTS * 0.71)] ?? earth;
  const length = Math.hypot(moon[0] - earth[0], moon[1] - earth[1]);
  s.liveLabels = (frame) => {
    const opacity = smoothstep(8.8, 8.95, frame.e) * (1 - smoothstep(9.4, 9.6, frame.e)) * smoothstep(250, 300, length * frame.pxPerUnit);
    return opacity > 0.01 ? [{ id: 'artemis', text: LABELS.places.artemis, at: label, kind: 'note', align: 'below', opacity }] : [];
  };

  // The Moon in its lens: the near side, lit by the Sun of the Earth.
  const scene = new Scene();
  scene.add(makeBody({ map: moonPicture.value, light: EARTH_LIGHT, radius: 1, ambient: 0.05, gain: 1.35 }));
  s.lens({ id: 'moon', at: moon, scene, fieldWidth: 2.5, angle: 60, label: LABELS.places.moon });
});
