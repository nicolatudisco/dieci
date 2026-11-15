/**
 * Curated placeholders for the stops of M3: `terra`, `luna`, `sole`, `giove`,
 * `pianeti-lontani`. Thin orbits and points of light, every distance true.
 * M3 replaces them: delete this file when its five stops have their real scenes.
 */
import { LABELS } from '../../content/labels.ts';
import { ANCHORS, AU, MOON_DISTANCE, type Vec3 } from '../../engine/stage.ts';
import { PLANETS, planet, planetPosition, type Planet } from '../solar-system.ts';
import { SUNLIGHT, drawEarth, drawSun, rgb } from './bodies.ts';
import { sketch, type Sketch } from './sketch.ts';

const MOON_RADIUS = 1_737_400;

/** Where a planet is, in the units of a level whose origin is the Sun. */
function place(s: Sketch, p: Planet): Vec3 {
  const sun = s.local(ANCHORS.sun);
  const [x, y] = planetPosition(p);
  return [sun[0] + s.units(x * AU), sun[1] + s.units(y * AU), sun[2]];
}

function orbit(s: Sketch, p: Planet, opacity: number): void {
  s.ring(s.local(ANCHORS.sun), s.units(p.au * AU), { opacity });
}

/** A planet as a point of light with its name. The Earth has the warm dot instead. */
function point(s: Sketch, p: Planet, align: 'above' | 'below' | 'left' | 'right' = 'above', from?: number): Vec3 {
  const at = place(s, p);
  s.dot(at, 7, rgb(p.color));
  s.label({ id: p.id, text: p.name, at, align, from });
  return at;
}

export const terra = sketch((s) => {
  drawEarth(s);
});

export const luna = sketch((s) => {
  const earth = drawEarth(s);
  const moon = s.local(ANCHORS.moon);
  s.ring(earth, s.units(MOON_DISTANCE), { opacity: 0.42 });
  const r = s.units(MOON_RADIUS);
  s.shape({ kind: 'ellipse', half: [r, r], color: '#c9ccd8' }, moon);
  s.dot(moon, 5, [0.82, 0.84, 0.92], 0.9);

  const scene = s.lensScene((shape) => {
    const light = SUNLIGHT;
    shape({ kind: 'ellipse', half: [1, 1], color: '#b3b6c4', rim: { color: '#f1f2f8', width: 0.5, light, strength: 0.8 } }, 0, 0);
    // The dark seas, then a few craters.
    const sea = { kind: 'ellipse', color: '#868a9c', soft: 0.12, mask: [0.9, 1] } as const;
    shape({ ...sea, half: [0.34, 0.26], opacity: 0.8 }, -0.28, 0.32, 20);
    shape({ ...sea, half: [0.24, 0.3], opacity: 0.75 }, 0.2, 0.18, -15);
    shape({ ...sea, half: [0.3, 0.18], opacity: 0.7 }, -0.05, -0.2, 8);
    shape({ ...sea, half: [0.15, 0.12], opacity: 0.7 }, 0.46, -0.1, 0);
    const crater = { kind: 'ellipse', color: '#9a9eaf', soft: 0.02, mask: [0.92, 1] } as const;
    shape({ ...crater, half: [0.07, 0.07] }, -0.2, -0.62);
    shape({ ...crater, half: [0.05, 0.05] }, 0.42, 0.52);
    shape({ ...crater, half: [0.04, 0.04] }, -0.62, -0.18);
  });
  s.lens({ id: 'moon', at: moon, scene, fieldWidth: 2.5, angle: 60, label: LABELS.places.moon });
});

export const sole = sketch((s) => {
  const sun = drawSun(s);
  for (const p of PLANETS.filter((q) => q.au < 2)) orbit(s, p, p.id === 'earth' ? 0.55 : 0.36);
  point(s, planet('mercury'), 'above');
  point(s, planet('venus'), 'below');
  point(s, planet('mars'), 'above');
  s.label({ id: 'sun', text: LABELS.places.sun, at: sun, align: 'below' });
});

export const giove = sketch((s) => {
  drawSun(s);
  for (const p of PLANETS.filter((q) => q.au < 2)) orbit(s, p, 0.26);
  const jupiter = planet('jupiter');
  orbit(s, jupiter, 0.5);
  const at = place(s, jupiter);
  s.dot(at, 7, rgb(jupiter.color));

  const scene = s.lensScene((shape) => {
    // Jupiter with its bands and the Great Red Spot; the four moons of Galileo on both sides.
    shape({ kind: 'ellipse', half: [1.5, 1.44], color: '#d9bf99', rim: { color: '#fff3dc', width: 0.6, light: [-0.8, 0.5], strength: 0.5 } }, 0, 0);
    const band = { kind: 'box', color: '#a9825f', soft: 0.08, mask: [1.38, 1.47] } as const;
    shape({ ...band, half: [1.6, 0.13], opacity: 0.85 }, 0, 0.42);
    shape({ ...band, half: [1.6, 0.17], opacity: 0.8 }, 0, -0.32);
    shape({ ...band, half: [1.6, 0.07], opacity: 0.55 }, 0, 0.92);
    shape({ ...band, half: [1.6, 0.08], opacity: 0.55 }, 0, -0.9);
    shape({ kind: 'ellipse', half: [0.27, 0.16], color: '#c0593f', soft: 0.04 }, 0.5, -0.36);
    const moon = { kind: 'ellipse', soft: 0.02 } as const;
    shape({ ...moon, half: [0.15, 0.15], color: '#e8d27c' }, 2.25, 0.05);
    shape({ ...moon, half: [0.13, 0.13], color: '#dcd6c6' }, -2.85, -0.04);
    shape({ ...moon, half: [0.21, 0.21], color: '#a99f8f' }, 3.6, -0.08);
    shape({ ...moon, half: [0.19, 0.19], color: '#7f766b' }, -4.4, 0.06);
  });
  // Lenses come in late too, so that two never crowd the stop before.
  s.lens({ id: 'jupiter', at, scene, fieldWidth: 10.2, angle: 35, label: LABELS.places.jupiterWithMoons, from: 11.95 });
});

export const pianetiLontani = sketch((s) => {
  drawSun(s);
  const outer = PLANETS.filter((q) => q.au > 2);
  for (const p of outer) orbit(s, p, 0.42);
  // Names come in late: at the stop before, Jupiter is named by its lens.
  point(s, planet('jupiter'), 'above', 12.8);
  point(s, planet('uranus'), 'below', 12.8);
  point(s, planet('neptune'), 'above', 12.8);
  const saturn = planet('saturn');
  const at = place(s, saturn);
  s.dot(at, 7, rgb(saturn.color));

  const scene = s.lensScene((shape) => {
    // The rings first, with their gap, then the globe in front of them.
    shape({ kind: 'ellipse', half: [2.75, 0.92], color: '#cdb98f', opacity: 0.9 }, 0, 0, -14);
    shape({ kind: 'ellipse', half: [2.3, 0.74], color: '#a8946c', opacity: 0.9 }, 0, 0, -14);
    shape({ kind: 'ellipse', half: [1.72, 0.52], color: '#0b1024' }, 0, 0, -14);
    shape({ kind: 'ellipse', half: [1.2, 1.1], color: '#dcc79a', rim: { color: '#fff4dc', width: 0.5, light: [-0.8, 0.5], strength: 0.5 } }, 0, 0, -14);
    shape({ kind: 'box', half: [1.3, 0.1], color: '#bfa777', opacity: 0.6, soft: 0.08, mask: [1.02, 1.1] }, 0, 0.3, -14);
  });
  s.lens({ id: 'saturn', at, scene, fieldWidth: 6.4, angle: 70, label: LABELS.places.saturn, from: 12.75 });
});
