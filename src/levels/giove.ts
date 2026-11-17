/**
 * The stop `giove`: the Sun, the small orbits of the rocky planets, the orbit of Jupiter and
 * Jupiter itself, a point of light at 5.2 AU.
 *
 * - The lens: Jupiter with its real picture (bands and the Great Red Spot, Solar System
 *   Scope), a little flattened at the poles as the real one, lit from the side of the Sun;
 *   the four moons of Galileo in a row on both sides, as he drew them night after night
 *   (seen edge-on, in the plane of their orbits). Their distances are squeezed and their
 *   sizes enlarged ×4, but their order and their sizes compared with each other are true:
 *   Io, Europa, Ganymede, Callisto from the inside out; Ganymede the largest.
 * - The probe Juice, a tiny point of light where it really is today compared with the Earth
 *   (src/juice.ts, NASA/JPL Horizons): in November 2026 it is still close to home, having
 *   just flown by the Earth. Its name only where there is room next to «Tu sei qui».
 *
 * Units: astronomical units. Origin: the Sun.
 */
import { Scene } from 'three';
import { LABELS } from '../content/labels.ts';
import { juicePlace } from '../juice.ts';
import { asyncSketch } from './async-sketch.ts';
import { makeBody } from './planet-lens.ts';
import { drawOrbit, placePlanet } from './sole.ts';
import { PLANETS, planet } from './solar-system.ts';
import { drawSun } from './sun.ts';
import { rgb } from './placeholder/bodies.ts';
import { acquire, loadColorTexture } from './textures.ts';
import { AU, type Vec3 } from '../engine/stage.ts';

/** From the planet towards the Sun on screen, and towards whoever looks: Jupiter almost full. */
function lightFor(angleDegrees: number, towardsViewer: number): Vec3 {
  const a = ((angleDegrees + 180) * Math.PI) / 180;
  const v = (towardsViewer * Math.PI) / 180;
  return [Math.cos(a) * Math.cos(v), Math.sin(a) * Math.cos(v), Math.sin(v)];
}

/** Polar radius of Jupiter over its equatorial radius (66,854 / 71,492 km). */
const JUPITER_FLATTENING = 0.935;

/** The four moons of Galileo in the lens: place along the row, radius (Jupiter = 1.5), colour. */
const GALILEAN = [
  { x: 2.25, radius: 0.15, color: '#e3c86e' }, // Io, sulphur yellow
  { x: -2.85, radius: 0.13, color: '#dcd3bf' }, // Europa, ice
  { x: 3.6, radius: 0.21, color: '#a49a8b' }, // Ganymede
  { x: -4.4, radius: 0.19, color: '#7a7166' }, // Callisto
] as const;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default asyncSketch(async (s) => {
  const picture = await acquire('jupiter', () => loadColorTexture('textures/jupiter.webp'), (t) => t.dispose());
  s.onDispose(picture.release);

  drawSun(s);
  for (const p of PLANETS.filter((q) => q.au < 2)) drawOrbit(s, p, 0.26);
  const jupiter = planet('jupiter');
  drawOrbit(s, jupiter, 0.5);
  const at = placePlanet(s, jupiter);
  s.dot(at, 7, rgb(jupiter.color));

  // The lens.
  const light = lightFor(jupiter.angle, 40);
  const scene = new Scene();
  // Turned so that the Great Red Spot faces us, a little towards the lit side.
  scene.add(makeBody({ map: picture.value, light, radius: 1.5, polarRadius: 1.5 * JUPITER_FLATTENING, ambient: 0.04, gain: 1.15, turn: (65 * Math.PI) / 180 }));
  for (const moon of GALILEAN) {
    const body = makeBody({ color: moon.color, light, radius: moon.radius, ambient: 0.05, gain: 1.2, segments: 24 });
    body.position.set(moon.x, 0, 0);
    scene.add(body);
  }
  // Lenses come in late too, so that two never crowd the stop before.
  s.lens({ id: 'jupiter', at, scene, fieldWidth: 10.2, angle: 35, label: LABELS.places.jupiterWithMoons, from: 11.95 });

  // Juice, where it is today compared with the Earth.
  const earth = planet('earth');
  const place = juicePlace(s.ctx.now());
  if (place.arrived) return;
  const turn = (earth.angle * Math.PI) / 180;
  const probe: Vec3 = [
    s.units((place.x * Math.cos(turn) - place.y * Math.sin(turn)) * AU),
    s.units((place.x * Math.sin(turn) + place.y * Math.cos(turn)) * AU),
    0,
  ];
  s.dot(probe, 4.5, rgb('#d6e2ff'), 1);
  const home = placePlanet(s, earth);
  const gap = Math.hypot(probe[0] - home[0], probe[1] - home[1]);
  // «Tu sei qui» is written on the right of the warm dot: the name goes above or below.
  const align = probe[1] < home[1] ? 'below' : 'above';
  s.liveLabels = (frame) => {
    const room = smoothstep(16, 24, gap * frame.pxPerUnit);
    const opacity = room * smoothstep(11.3, 11.55, frame.e) * (1 - smoothstep(12.6, 12.85, frame.e));
    return opacity > 0.01 ? [{ id: 'juice', text: LABELS.places.juice, at: probe, kind: 'note', align, opacity }] : [];
  };
});
