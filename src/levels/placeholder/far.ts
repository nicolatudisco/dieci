/**
 * Curated placeholders for the stops of M4: `voyager`, `oort`, `bolla`.
 * M4 replaces them: delete this file when its three stops have their real scenes.
 */
import { NEARBY_STARS } from '../../content/data.ts';
import { LABELS } from '../../content/labels.ts';
import { UI } from '../../content/ui.ts';
import { ANCHORS, AU, type Vec3 } from '../../engine/stage.ts';
import { stageFromEquatorial } from '../sky.ts';
import { planet } from '../solar-system.ts';
import { drawSun } from './bodies.ts';
import { shell } from './clouds.ts';
import { sketch } from './sketch.ts';

export const voyager = sketch((s) => {
  const sun = drawSun(s);
  // The orbit of Neptune, for comparison: every planet is inside this small circle.
  const neptune = s.units(planet('neptune').au * AU);
  s.ring(sun, neptune, { opacity: 0.42 });
  s.label({ id: 'neptune', text: LABELS.places.neptuneOrbit, at: [sun[0], sun[1] - neptune, sun[2]], kind: 'note', align: 'below' });

  const probe = s.local(ANCHORS.voyager1);
  s.line(sun, probe, { dash: [5, 7], opacity: 0.5 });
  s.dot(probe, 6, [0.95, 0.96, 1]);

  const scene = s.lensScene((shape) => {
    const metal = '#aeb6cc';
    // Booms first: the long magnetometer arm, the generators, the two whip antennas.
    shape({ kind: 'box', half: [1.7, 0.035], color: metal }, 1.55, -0.75, -26);
    shape({ kind: 'box', half: [0.75, 0.05], color: metal }, -0.95, 0.5, -28);
    shape({ kind: 'box', half: [0.28, 0.12], radius: 0.1, color: '#7f879d' }, -1.55, 0.82, -28);
    shape({ kind: 'box', half: [1.25, 0.02], color: metal, opacity: 0.8 }, -0.75, -0.95, 52);
    shape({ kind: 'box', half: [1.25, 0.02], color: metal, opacity: 0.8 }, 0.55, 1.05, 62);
    // The ten-sided body, hidden behind the big white dish.
    shape({ kind: 'box', half: [0.5, 0.5], radius: 0.16, color: '#6f7890' }, 0.12, -0.1, 12);
    shape({ kind: 'ellipse', half: [1, 1], color: '#eef0f7', rim: { color: '#ffffff', width: 0.3, light: [-0.7, 0.7], strength: 0.6 } }, 0, 0);
    shape({ kind: 'ellipse', half: [0.72, 0.72], color: '#d6dae6', soft: 0.2 }, 0.05, -0.05);
    shape({ kind: 'ellipse', half: [0.15, 0.15], color: '#8a92a8' }, 0, 0);
  });
  s.lens({ id: 'voyager', at: probe, scene, fieldWidth: 5.6, angle: 120, label: LABELS.places.voyager1 });
});

export const oort = sketch((s) => {
  // Units: thousands of astronomical units. The cloud starts a few thousand AU from the
  // Sun and thins out towards 100,000 AU (NASA, «Oort Cloud: Facts»).
  s.dots(shell(1950, 4200, 2, 86), { adaptive: true, opacity: 0.9 });
  const sun = s.local(ANCHORS.sun);
  const top: Vec3 = [sun[0], sun[1] + 52, sun[2]];
  s.label({ id: 'cloud', text: LABELS.places.oortCloud, at: top, kind: 'note', align: 'above' });
});

/** Light-years. M1 keeps the bubble at ten; M4 makes it follow her age. */
const BUBBLE_RADIUS = 10;
const WARM = '#ffb24d';

/** The stars that are named: the ones the texts talk about. */
const NAMED: Record<string, 'above' | 'below' | 'left' | 'right'> = {
  'Proxima Centauri': 'above',
  'Stella di Barnard': 'above',
  Sirio: 'right',
  'Epsilon Eridani': 'above',
  '61 Cygni': 'above',
};

export const bolla = sketch((s) => {
  const sun = s.local(ANCHORS.sun);
  // The bubble: a sphere of warm light around the Sun, seen as a soft disc with a clear edge.
  // Like a soap bubble it is brightest at its edge: from inside, the night stays dark.
  s.shape({ kind: 'ellipse', half: [BUBBLE_RADIUS, BUBBLE_RADIUS], color: WARM, opacity: 0.05, soft: 0.4, additive: true }, sun);
  s.shape({ kind: 'halo', half: [BUBBLE_RADIUS, 0], color: WARM, opacity: 0.34, soft: BUBBLE_RADIUS * 0.3, additive: true }, sun);
  s.ring(sun, BUBBLE_RADIUS, { color: '#ffd27a', opacity: 0.8, line: 1.5 });

  for (const star of NEARBY_STARS) {
    const [x, y, z] = stageFromEquatorial(star.raHours, star.decDeg, star.ly);
    const at: Vec3 = [sun[0] + x, sun[1] + y, sun[2] + z];
    // Lit when the light of her birthday has reached it: the same test in three dimensions.
    const reached = star.ly <= BUBBLE_RADIUS;
    s.dot(at, reached ? 10 : 7, reached ? [1, 0.9, 0.7] : [0.6, 0.68, 0.95], reached ? 1 : 0.75);
    const align = NAMED[star.name];
    if (!align) continue;
    s.label({ id: star.name, text: star.name, at, align });
    if (!reached && star.name === 'Epsilon Eridani') {
      s.label({ id: `${star.name}/note`, text: UI.bubble.starNotYet, at, kind: 'note', align: 'below' });
    }
  }
});
