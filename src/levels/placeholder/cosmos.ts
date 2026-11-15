/**
 * Curated placeholders for the stops of M5: `nebulose`, `via-lattea`, `andromeda`,
 * `laniakea`, `rete-cosmica`, `universo`.
 * M5 replaces them: delete this file when its six stops have their real scenes.
 */
import { OBSERVABLE_UNIVERSE_RADIUS_LY } from '../../content/data.ts';
import { LABELS } from '../../content/labels.ts';
import { ANCHORS, type Vec3 } from '../../engine/stage.ts';
import { flow, spiral, starField, web } from './clouds.ts';
import { mulberry32 } from './primitives.ts';
import { sketch, type Sketch } from './sketch.ts';

export const nebulose = sketch((s) => {
  // Units: hundreds of light-years. No invented star closer than 30 light-years to the Sun:
  // that neighbourhood belongs to the real stars of the bubble.
  s.dots(starField(1344, 2200, 30, 0.6, 0.3), { adaptive: true });

  // Nameless clouds of gas, faint and wide.
  const random = mulberry32(88);
  for (let i = 0; i < 7; i++) {
    const at: Vec3 = [(random() * 2 - 1) * 12, (random() * 2 - 1) * 12 - 3, 0];
    const size = 0.35 + random() * 0.5;
    s.shape({ kind: 'ellipse', half: [size, size * (0.5 + random() * 0.4)], color: random() < 0.5 ? '#c8527f' : '#4d6fd8', opacity: 0.2, soft: size * 1.4, additive: true }, at, random() * 180);
  }

  // The Orion Nebula: about 24 light-years across, 1,344 light-years away.
  const orion = s.local(ANCHORS.orionNebula);
  s.shape({ kind: 'ellipse', half: [0.13, 0.1], color: '#e2608f', opacity: 0.9, soft: 0.22, additive: true }, orion, 25);
  s.shape({ kind: 'ellipse', half: [0.07, 0.1], color: '#6f8cff', opacity: 0.6, soft: 0.16, additive: true }, [orion[0] + 0.05, orion[1] + 0.04, orion[2]], -20);
  s.dot(orion, 7, [1, 0.72, 0.84]);
  s.label({ id: 'orion', text: LABELS.places.orionNebula, at: orion, align: 'below' });
});

/**
 * The Milky Way from above its north pole. Units: tens of thousands of light-years; the
 * disc is 100,000 light-years across. The near end of the bar is turned about 27° from the
 * line between the Sun and the centre, towards growing longitudes (on screen: to the left).
 */
export const viaLattea = sketch((s) => {
  const centre: Vec3 = [0, 0, 0];
  s.shape({ kind: 'ellipse', half: [5, 5], color: '#2c3a6b', opacity: 0.36, soft: 3, additive: true }, centre);
  s.shape({ kind: 'ellipse', half: [1.15, 0.6], color: '#f1dfb8', opacity: 0.42, soft: 1, additive: true }, centre, 63);
  s.dots(spiral(2026, 9000, 5, 63), { adaptive: true, opacity: 0.85 });
});

function galaxy(s: Sketch, at: Vec3, halfLong: number, halfShort: number, degrees: number, size: number): void {
  s.shape({ kind: 'ellipse', half: [halfLong, halfShort], color: '#cfd8ff', opacity: 0.8, soft: halfLong * 0.9, additive: true }, at, degrees);
  s.dot(at, size, [0.95, 0.93, 1]);
}

export const andromeda = sketch((s) => {
  // Units: millions of light-years.
  const milkyWay = s.local(ANCHORS.galacticCentre);
  const m31 = s.local(ANCHORS.andromeda);
  // The Triangulum Galaxy: about 2.7 million light-years from us, 0.75 from Andromeda.
  const m33: Vec3 = [m31[0] + 0.75 * Math.cos((-55 * Math.PI) / 180), m31[1] + 0.75 * Math.sin((-55 * Math.PI) / 180), m31[2]];
  galaxy(s, milkyWay, 0.05, 0.05, 0, 9);
  galaxy(s, m31, 0.11, 0.045, 35, 11);
  galaxy(s, m33, 0.03, 0.025, 10, 6);

  // The dozens of small galaxies of the Local Group, gathered around the two big ones.
  const random = mulberry32(54);
  const positions: number[] = [];
  const sizes: number[] = [];
  const colors: number[] = [];
  const phases: number[] = [];
  for (let i = 0; i < 46; i++) {
    const host = i % 2 === 0 ? milkyWay : m31;
    const r = 0.1 + 0.5 * random() ** 1.5;
    const a = random() * Math.PI * 2;
    positions.push(host[0] + r * Math.cos(a), host[1] + r * Math.sin(a), host[2] + (random() - 0.5) * 0.4);
    sizes.push(2.2 + 1.6 * random());
    const level = 0.35 + 0.35 * random();
    colors.push(0.8 * level, 0.85 * level, level);
    phases.push(random());
  }
  s.dots({ positions: new Float32Array(positions), sizes: new Float32Array(sizes), colors: new Float32Array(colors), phases: new Float32Array(phases) });

  s.label({ id: 'milky-way', text: LABELS.places.milkyWay, at: milkyWay, align: 'below' });
  s.label({ id: 'andromeda', text: LABELS.places.andromeda, at: m31, align: 'above' });
  s.label({ id: 'triangulum', text: LABELS.places.triangulum, at: m33, align: 'below' });
});

export const laniakea = sketch((s) => {
  // Units: hundreds of millions of light-years. Laniakea is about 520 million across.
  const centre: Vec3 = [0, 0, 0];
  const radius = 2.6;
  s.shape({ kind: 'ellipse', half: [radius, radius], color: '#2a3568', opacity: 0.2, soft: 1.1, additive: true }, centre);
  s.ring(centre, radius, { opacity: 0.26 });
  // Its galaxies flow towards one basin; outside, the galaxies of other superclusters.
  s.dots(flow(2014, 3200, radius), { adaptive: true });
  s.dots(starField(520, 1500, 12, 0.6, radius * 1.05), { adaptive: true, opacity: 0.6 });
});

export const reteCosmica = sketch((s) => {
  // Units: billions of light-years. A ball of web around us, thinning out at its edge.
  // A thick slice rather than a whole ball, so that its filaments are seen as filaments.
  s.dots(web(2022, { knots: 230, count: 24000, radius: 10, fade: 0.5, depth: 0.16, thickness: 0.05 }), { adaptive: true });
});

export const universo = sketch((s) => {
  // Units: tens of billions of light-years. The edge is 46.5 billion light-years away.
  const centre = s.local(ANCHORS.earth);
  const radius = OBSERVABLE_UNIVERSE_RADIUS_LY / 1e10;
  // The edge glows like a surface of ancient light.
  s.shape({ kind: 'halo', half: [radius, 0], color: '#f0d3bd', opacity: 0.55, soft: radius * 0.085, additive: true }, centre);
  s.dots(web(1380, { knots: 520, count: 14000, radius: radius * 0.985, fade: 0.9, depth: 1, thickness: radius * 0.02 }), { adaptive: true, opacity: 0.9 });
  s.ring(centre, radius, { color: '#f6e2d2', opacity: 0.85, line: 1.5 });
});
