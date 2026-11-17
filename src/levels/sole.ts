/**
 * The stop `sole`: the Sun in the middle with its glare and corona (sun.ts), the orbits of
 * the four rocky planets as thin lines, Mercury, Venus and Mars as points of light with
 * their names. The Earth is the warm dot, «Tu sei qui»: at this scale it is far smaller than
 * a pixel. Every distance is true (solar-system.ts); where each planet is along its orbit is
 * a choice of composition.
 *
 * Units: astronomical units. Origin: the Sun.
 */
import { LABELS } from '../content/labels.ts';
import { AU, type Vec3 } from '../engine/stage.ts';
import { rgb } from './placeholder/bodies.ts';
import { sketch, type Sketch } from './placeholder/sketch.ts';
import { PLANETS, planet, planetPosition, type Planet } from './solar-system.ts';
import { drawSun } from './sun.ts';

/** Where a planet is, in the units of a level whose origin is the Sun. */
export function placePlanet(s: Sketch, p: Planet): Vec3 {
  const [x, y] = planetPosition(p);
  return [s.units(x * AU), s.units(y * AU), 0];
}

/** The orbit of a planet: a thin circle around the Sun. */
export function drawOrbit(s: Sketch, p: Planet, opacity: number): void {
  s.ring([0, 0, 0], s.units(p.au * AU), { opacity });
}

/** A planet as a point of light with its name. */
export function drawPlanet(s: Sketch, p: Planet, align: 'above' | 'below' | 'left' | 'right', from?: number, to?: number): Vec3 {
  const at = placePlanet(s, p);
  s.dot(at, 7, rgb(p.color));
  s.label({ id: p.id, text: p.name, at, align, from, to });
  return at;
}

export default sketch((s) => {
  const sun = drawSun(s);
  for (const p of PLANETS.filter((q) => q.au < 2)) drawOrbit(s, p, p.id === 'earth' ? 0.55 : 0.36);
  drawPlanet(s, planet('mercury'), 'above');
  drawPlanet(s, planet('venus'), 'below');
  drawPlanet(s, planet('mars'), 'above');
  s.label({ id: 'sun', text: LABELS.places.sun, at: sun, align: 'below' });
});
