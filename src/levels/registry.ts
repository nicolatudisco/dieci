/**
 * The levels of the journey: which module draws each stop, in which units, around which
 * anchor, and over which range of the journey axis.
 *
 * To replace a placeholder with a real scene, a milestone changes `load` (and, if needed,
 * unit, origin and ranges) in the entry of its own stop. Nothing else needs to change:
 * the engine aligns the level with its neighbours through the stage, not through them.
 */
import { STOPS } from '../content/levels.ts';
import { FINALE, nodeById } from '../engine/journey.ts';
import type { LevelDef } from '../engine/level.ts';
import { AU, LY, type AnchorId } from '../engine/stage.ts';

type Loader = LevelDef['load'];

const generic: Loader = () => import('./placeholder/generic.ts');
// Curated placeholders, one module per later milestone (M3, M4, M5).
const solar = (name: keyof typeof import('./placeholder/solar.ts')): Loader => () =>
  import('./placeholder/solar.ts').then((m) => ({ default: m[name] }));
const far = (name: keyof typeof import('./placeholder/far.ts')): Loader => () =>
  import('./placeholder/far.ts').then((m) => ({ default: m[name] }));
const cosmos = (name: keyof typeof import('./placeholder/cosmos.ts')): Loader => () =>
  import('./placeholder/cosmos.ts').then((m) => ({ default: m[name] }));

interface Entry {
  /** Metres in one local unit. */
  unit: number;
  origin: AnchorId;
  load?: Loader;
  /** Where the level starts to appear and where it is fully there (default: see below). */
  enter?: readonly [number, number];
  /** Where the level starts to fade and where it is gone (default: see below). */
  leave?: readonly [number, number];
}

/**
 * One entry per stop of Act I. Units are chosen so that the content of the level stays
 * within about 1e-3 .. 1e4 units (comments: view width at the stop, in units).
 *
 * A level enters late (`enter`) when its content would otherwise cross the scene of the
 * stop before: the orbit of the Earth through the Moon scene, the warm bubble over the
 * Oort cloud, a second Milky Way over the first.
 */
const ACT_ONE: Record<string, Entry> = {
  partenza: { unit: 1, origin: 'you', load: () => import('./placeholder/partenza.ts') }, // 1 m
  strada: { unit: 1, origin: 'you' }, // 10
  rifredi: { unit: 100, origin: 'you' }, // 1 (hundred metres)
  quartiere: { unit: 1e3, origin: 'you' }, // 1 km
  firenze: { unit: 1e3, origin: 'you' }, // 10 km
  toscana: { unit: 1e4, origin: 'you' }, // 10 (tens of km)
  italia: { unit: 1e5, origin: 'you' }, // 12.6 (hundreds of km)
  terra: { unit: 1e6, origin: 'earth', load: solar('terra') }, // 15.8 (thousands of km); Earth radius 6.371
  luna: { unit: 1e8, origin: 'earth', load: solar('luna') }, // 10; the Moon is at 3.844
  sole: { unit: AU, origin: 'sun', load: solar('sole'), enter: [9.3, 10.2] }, // 2.66 AU
  giove: { unit: AU, origin: 'sun', load: solar('giove') }, // 13.3 AU
  'pianeti-lontani': { unit: AU, origin: 'sun', load: solar('pianetiLontani') }, // 66.8 AU
  voyager: { unit: 10 * AU, origin: 'sun', load: () => import('./voyager.ts'), enter: [13.05, 13.4] }, // 33.5 (tens of AU)
  oort: { unit: 1e3 * AU, origin: 'sun', load: far('oort') }, // 168 (thousands of AU)
  bolla: { unit: LY, origin: 'sun', load: far('bolla'), enter: [16.6, 17.1] }, // 33.4 light-years
  nebulose: { unit: 100 * LY, origin: 'sun', load: cosmos('nebulose') }, // 26.5 (hundreds of ly)
  // Its nine thousand points turn into a white blob as they shrink: Andromeda's level takes over.
  'via-lattea': { unit: 1e4 * LY, origin: 'galacticCentre', load: cosmos('viaLattea'), enter: [19.6, 20.4], leave: [21.5, 22.1] }, // 16.8 (tens of thousands of ly)
  andromeda: { unit: 1e6 * LY, origin: 'localGroup', load: cosmos('andromeda'), enter: [21.5, 22.1] }, // 6.7 million ly
  // Its cloud of points turns into a bright blob as it shrinks: it leaves early.
  laniakea: { unit: 1e8 * LY, origin: 'laniakea', load: cosmos('laniakea'), enter: [23.4, 24.1], leave: [25.3, 26] }, // 6.7 (hundreds of millions of ly)
  // Its ball of web is local: it must be gone before the whole universe is in view.
  'rete-cosmica': { unit: 1e9 * LY, origin: 'earth', load: cosmos('reteCosmica'), leave: [26.2, 26.75] }, // 4.2 billion ly
  // Stays alive while the camera keeps pulling back in Act II, until it is a point.
  universo: { unit: 1e10 * LY, origin: 'earth', load: cosmos('universo'), leave: [28.3, 29.2] }, // 9.2
};

/** Where a level appears and disappears, relative to its own stop and the one before. */
const ENTER_BEFORE_PREVIOUS = 0.3;
const ENTER_DONE_AFTER_PREVIOUS = 0.1;
const LEAVE_START = 0.9;
const LEAVE_END = 1.6;

function buildActOne(): LevelDef[] {
  const stops = STOPS.filter((s) => s.kind === 'space');
  return stops.map((stop, k) => {
    const entry = ACT_ONE[stop.id];
    if (!entry) throw new Error(`No level registered for stop "${stop.id}"`);
    const previous = stops[k - 1];
    const e = stop.exponent;
    // The first level comes out of the black of the opening.
    const enter = previous ? previous.exponent - ENTER_BEFORE_PREVIOUS : -1;
    const entered = previous ? previous.exponent + ENTER_DONE_AFTER_PREVIOUS : -0.25;
    const [from, full] = entry.enter ?? [enter, entered];
    const [fading, gone] = entry.leave ?? [e + LEAVE_START, e + LEAVE_END];
    return {
      id: stop.id,
      unit: entry.unit,
      origin: entry.origin,
      range: [from, gone],
      fadeIn: [from, full],
      fadeOut: [fading, gone],
      // Back to front: the level of a wider stop is always behind the one of a closer stop.
      order: -e,
      load: entry.load ?? generic,
    };
  });
}

const numbers = (name: keyof typeof import('./placeholder/numbers.ts')): Loader => () =>
  import('./placeholder/numbers.ts').then((m) => ({ default: m[name] }));

/**
 * Act II: one typographic level per stop. Each one comes in while the journey approaches
 * its stop and is gone before the next one starts, so two numbers are never on screen
 * together. The last one stays until the finale takes over.
 */
function buildActTwo(): LevelDef[] {
  const stops = STOPS.filter((s) => s.kind === 'number');
  const loaders: Record<string, Loader> = {
    oltre: numbers('oltre'),
    atomi: numbers('atomi'),
    googol: numbers('googol'),
    googolplex: numbers('googolplex'),
  };
  return stops.map((stop, k) => {
    const u = nodeById(stop.id)?.u;
    const load = loaders[stop.id];
    if (u === undefined || !load) throw new Error(`No level registered for stop "${stop.id}"`);
    const last = k === stops.length - 1;
    const gone = last ? FINALE.u - 0.1 : u + 0.85;
    return {
      id: stop.id,
      // DOM only: unit and origin are not used.
      unit: 1,
      origin: 'you',
      range: [u - 1.1, gone],
      fadeIn: [u - 1.1, u - 0.8],
      fadeOut: [last ? FINALE.u - 0.6 : u + 0.35, gone],
      order: 100 + k,
      load,
    };
  });
}

export const LEVELS: readonly LevelDef[] = [...buildActOne(), ...buildActTwo()];
