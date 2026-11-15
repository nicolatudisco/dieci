/**
 * The levels of the journey: which module draws each stop, in which units, around which
 * anchor, and over which range of the journey axis.
 *
 * To replace a placeholder with a real scene, a milestone changes `load` (and, if needed,
 * unit, origin and ranges) in the entry of its own stop. Nothing else needs to change:
 * the engine aligns the level with its neighbours through the stage, not through them.
 */
import { STOPS } from '../content/levels.ts';
import { E_MAX } from '../engine/journey.ts';
import type { LevelDef } from '../engine/level.ts';
import { AU, LY, type AnchorId } from '../engine/stage.ts';

type Loader = LevelDef['load'];

const generic: Loader = () => import('./placeholder/generic.ts');

interface Entry {
  /** Metres in one local unit. */
  unit: number;
  origin: AnchorId;
  load?: Loader;
  /** Overrides of the default ranges below. */
  range?: readonly [number, number];
  fadeIn?: readonly [number, number];
  fadeOut?: readonly [number, number];
}

/**
 * One entry per stop of Act I. Units are chosen so that the content of the level stays
 * within about 1e-3 .. 1e4 units (comments: view width at the stop, in units).
 */
const ACT_ONE: Record<string, Entry> = {
  partenza: { unit: 1, origin: 'you', load: () => import('./placeholder/partenza.ts') }, // 1 m
  strada: { unit: 1, origin: 'you' }, // 10
  rifredi: { unit: 100, origin: 'you' }, // 1 (hundred metres)
  quartiere: { unit: 1e3, origin: 'you' }, // 1 km
  firenze: { unit: 1e3, origin: 'you' }, // 10 km
  toscana: { unit: 1e4, origin: 'you' }, // 10 (tens of km)
  italia: { unit: 1e5, origin: 'you' }, // 12.6 (hundreds of km)
  terra: { unit: 1e6, origin: 'earth' }, // 15.8 (thousands of km); Earth radius 6.371
  luna: { unit: 1e8, origin: 'earth' }, // 10; the Moon is at 3.844
  sole: { unit: AU, origin: 'sun' }, // 2.66 AU
  giove: { unit: AU, origin: 'sun' }, // 13.3 AU
  'pianeti-lontani': { unit: AU, origin: 'sun' }, // 66.8 AU
  voyager: { unit: 10 * AU, origin: 'sun' }, // 33.5 (tens of AU)
  oort: { unit: 1e3 * AU, origin: 'sun' }, // 168 (thousands of AU)
  bolla: { unit: LY, origin: 'sun' }, // 33.4 light-years
  nebulose: { unit: 100 * LY, origin: 'sun' }, // 26.5 (hundreds of ly)
  'via-lattea': { unit: 1e4 * LY, origin: 'galacticCentre' }, // 16.8 (tens of thousands of ly)
  andromeda: { unit: 1e6 * LY, origin: 'localGroup' }, // 6.7 million ly
  laniakea: { unit: 1e8 * LY, origin: 'laniakea' }, // 6.7 (hundreds of millions of ly)
  'rete-cosmica': { unit: 1e9 * LY, origin: 'earth' }, // 4.2 billion ly
  // Stays alive while the camera keeps pulling back in Act II, until it is a point.
  universo: { unit: 1e10 * LY, origin: 'earth', range: [25.3, 29.5], fadeOut: [28.3, 29.2] }, // 9.2
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
    return {
      id: stop.id,
      unit: entry.unit,
      origin: entry.origin,
      range: entry.range ?? [enter, Math.min(e + LEAVE_END, E_MAX + LEAVE_END)],
      fadeIn: entry.fadeIn ?? [enter, entered],
      fadeOut: entry.fadeOut ?? [e + LEAVE_START, e + LEAVE_END],
      // Back to front: the level of a wider stop is always behind the one of a closer stop.
      order: -e,
      load: entry.load ?? generic,
    };
  });
}

export const LEVELS: readonly LevelDef[] = buildActOne();
