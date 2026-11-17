/**
 * The levels of the journey: which module draws each stop, in which units, around which
 * anchor, and over which range of the journey axis.
 *
 * To replace a placeholder with a real scene, a milestone changes `load` (and, if needed,
 * unit, origin and ranges) in the entry of its own stop. Nothing else needs to change:
 * the engine aligns the level with its neighbours through the stage, not through them.
 */
import { STOPS } from '../content/levels.ts';
import { EPILOGUE, FINALE, nodeById } from '../engine/journey.ts';
import type { LevelDef } from '../engine/level.ts';
import { AU, LY, type AnchorId } from '../engine/stage.ts';

type Loader = LevelDef['load'];

// Curated placeholders of the milestone still to come (M5). The stops of M2 (the ground),
// M3 (the Earth and the Solar System) and M4 (`voyager`, `oort`, `bolla`) have their real scenes.
const cosmos = (name: keyof typeof import('./placeholder/cosmos.ts')): Loader => () =>
  import('./placeholder/cosmos.ts').then((m) => ({ default: m[name] }));

interface Entry {
  /** Metres in one local unit. */
  unit: number;
  origin: AnchorId;
  load: Loader;
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
  partenza: { unit: 1, origin: 'you', load: () => import('./partenza.ts') }, // 1 m
  // It leaves early: at 100 m the real map of `rifredi` is already underneath.
  strada: { unit: 1, origin: 'you', load: () => import('./strada.ts'), leave: [1.55, 2.2] }, // 10
  rifredi: { unit: 100, origin: 'you', load: () => import('./rifredi.ts') }, // 1 (hundred metres)
  quartiere: { unit: 1e3, origin: 'you', load: () => import('./quartiere.ts') }, // 1 km
  firenze: { unit: 1e3, origin: 'you', load: () => import('./firenze.ts') }, // 10 km
  toscana: { unit: 1e4, origin: 'you', load: () => import('./toscana.ts') }, // 10 (tens of km)
  italia: { unit: 1e5, origin: 'you', load: () => import('./italia.ts') }, // 12.6 (hundreds of km)
  terra: { unit: 1e6, origin: 'earth', load: () => import('./terra.ts') }, // 15.8 (thousands of km); Earth radius 6.371
  luna: { unit: 1e8, origin: 'earth', load: () => import('./luna.ts') }, // 10; the Moon is at 3.844
  sole: { unit: AU, origin: 'sun', load: () => import('./sole.ts'), enter: [9.3, 10.2] }, // 2.66 AU
  giove: { unit: AU, origin: 'sun', load: () => import('./giove.ts') }, // 13.3 AU
  'pianeti-lontani': { unit: AU, origin: 'sun', load: () => import('./pianeti-lontani.ts') }, // 66.8 AU
  voyager: { unit: 10 * AU, origin: 'sun', load: () => import('./voyager.ts'), enter: [13.05, 13.4] }, // 33.5 (tens of AU)
  // Seen from the bubble it would be a ball of sparks on the warm dot: it leaves before.
  oort: { unit: 1e3 * AU, origin: 'sun', load: () => import('./oort.ts'), leave: [16.85, 17.35] }, // 168 (thousands of AU)
  bolla: { unit: LY, origin: 'sun', load: () => import('./bolla.ts'), enter: [16.6, 17.1] }, // 33.4 light-years
  nebulose: { unit: 100 * LY, origin: 'sun', load: () => import('./nebulose.ts') }, // 26.5 (hundreds of ly)
  // The galaxy is the glow of the disc behind the nebulae already, and comes out as the view
  // widens. It leaves while `andromeda` draws the same galaxy (MAX blending: no seam).
  'via-lattea': { unit: 1e4 * LY, origin: 'galacticCentre', load: () => import('./via-lattea.ts'), enter: [18.3, 19.2], leave: [21.5, 22.1] }, // 16.8 (tens of thousands of ly)
  // Its Milky Way is drawn full from the start: the twin of `via-lattea` is underneath.
  andromeda: { unit: 1e6 * LY, origin: 'localGroup', load: () => import('./andromeda.ts'), enter: [21.5, 22.1] }, // 6.7 million ly
  // Its galaxies dim as the view widens; its edge stays a little longer, inside the web.
  laniakea: { unit: 1e8 * LY, origin: 'laniakea', load: () => import('./laniakea.ts'), enter: [23.4, 24.1], leave: [25.3, 26] }, // 6.7 (hundreds of millions of ly)
  // The same web as Laniakea's, more coarsely: it comes in once Laniakea has been seen.
  'rete-cosmica': { unit: 1e9 * LY, origin: 'earth', load: () => import('./rete-cosmica.ts'), enter: [24.95, 25.4], leave: [26.2, 26.75] }, // 4.2 billion ly
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
      load: entry.load,
    };
  });
}

/** The position of a stop of Act II on the journey axis. */
function at(id: string): number {
  const u = nodeById(id)?.u;
  if (u === undefined) throw new Error(`Unknown stop "${id}"`);
  return u;
}

/**
 * Act II: scenes made of numbers, drawn in 2D over the stage (unit and origin are not
 * used). A scene comes in while the journey approaches its first stop and is gone before
 * the next scene starts: two of them are never on screen together.
 *
 * - `oltre`: digits that surface and sink towards the point that was the universe.
 * - `zeri`: one number that grows, from the 80 zeros of the atoms to the 100 of the googol
 *   to the wall of zeros of the googolplex, and then turns into the light that gathers
 *   into the warm dot just before the finale.
 */
function buildActTwo(): LevelDef[] {
  const scene = (id: string, covers: readonly string[], order: number, load: Loader, leave?: readonly [number, number]): LevelDef => {
    const first = at(covers[0] ?? id);
    const last = at(covers[covers.length - 1] ?? id);
    const fadeOut = leave ?? [last + 0.35, last + 0.85];
    return {
      id,
      covers,
      unit: 1,
      origin: 'you',
      range: [first - 1.1, fadeOut[1]],
      fadeIn: [first - 1.1, first - 0.8],
      fadeOut,
      order,
      load,
    };
  };
  return [
    scene('oltre', ['oltre'], 100, () => import('./beyond.ts')),
    scene('zeri', ['atomi', 'googol', 'googolplex'], 101, () => import('./zeros.ts'), [FINALE.u - 0.15, FINALE.u - 0.07]),
  ];
}

/**
 * The scene of the finale: drawn in 2D over the stage like Act II, around the warm dot. It
 * comes in while the light of the googolplex gathers into the dot and stays, quieter,
 * behind the epilogue: the light does not go out when the words leave. The unit only keeps
 * the numbers small: the one thing it places is the lens, on the origin.
 */
function buildFinale(): LevelDef {
  const u = FINALE.u;
  return {
    id: 'finale',
    unit: 1e40,
    origin: 'you',
    range: [u - 0.5, EPILOGUE.u + 0.01],
    fadeIn: [u - 0.45, u - 0.1],
    order: 110,
    load: () => import('./finale.ts'),
  };
}

export const LEVELS: readonly LevelDef[] = [...buildActOne(), ...buildActTwo(), buildFinale()];
