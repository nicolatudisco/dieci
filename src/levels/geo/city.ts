/**
 * The city at night, as `rifredi`, `quartiere` and `firenze` draw it: the same layers with
 * the same colours at every scale (the look depends only on the exponent), so that the
 * three levels fade into one another without a seam.
 *
 * - Streets at their true width: asphalt seen from close by, warm threads from far away
 *   (roadLook); far away a soft glow piles up where streets are dense, the light of the city.
 * - Waters (rivers as lines and as areas), parks and woods, the railway and its yards.
 */
import type { LevelFrame } from '../../engine/level.ts';
import { cityLights, LIGHT, type CityLight } from './city-lights.ts';
import { BRIDGE, GREEN, RAIL, ROAD, type GeoFile, type GeoLine } from './format.ts';
import { LAMPLIGHT, makeAreas, makeLights, makeLines, roadLook, setClass, type LineLayer, type Palette } from './layers.ts';
import type { GeoSketch } from './level.ts';
import { breathe } from './load.ts';

export const WATER = '#0c1c38';
const RIVER_SHINE = '#3f6fb2';

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The asphalt; pavements and lanes a little lighter (stone), bridges a little brighter (over the dark water). */
function paintRoads(palette: Palette, e: number): void {
  const { asphalt } = roadLook(e);
  for (let cls = 0; cls < 16; cls++) {
    const kind = cls & 7;
    if (kind === ROAD.path) setClass(palette, cls, '#23242d', 0.9);
    else if (kind === ROAD.service) setClass(palette, cls, asphalt, 0.8);
    else setClass(palette, cls, asphalt, cls & BRIDGE ? 1.15 : 1);
  }
}

/** The thread of lamp light: main streets brighter, small ones quieter, none on pavements. */
function paintLamplight(palette: Palette, e: number): void {
  const { warmth } = roadLook(e);
  const gains = [1, 1, 0.95, 0.85, 0.6, 0.55, 0, 0];
  for (let cls = 0; cls < 16; cls++) setClass(palette, cls, LAMPLIGHT, warmth * (gains[cls & 7] ?? 0) * (cls & BRIDGE ? 1.2 : 1));
}

/**
 * The glow of the city, seen from far away: strongest at the scale of the whole town.
 * The same function in every level, so the glow does not jump in a hand-over.
 */
export function cityGlow(e: number): number {
  return smoothstep(2.6, 3.8, e) * (1 - 0.5 * smoothstep(4.6, 5.6, e));
}

/** Side of the tiles of the city layers, metres: a tile out of view is not drawn. */
const DEFAULT_CELL = 1500;

export interface CityOptions {
  /** How much streets thinner than their drawn line are dimmed (0..1). */
  readonly thinDim: number;
  /** Minimum width of a street, CSS pixels. */
  readonly minPx: number;
  /**
   * The glow of the city. It is additive, so only one level may draw it (`firenze`, which
   * covers the whole town), or it would double where two levels overlap.
   */
  readonly glow?: boolean;
  /**
   * Side of the tiles the layers are cut in, metres (default 1.5 km). Small tiles suit a view
   * of a kilometre, where most of them are off screen; a view of ten kilometres would draw
   * dozens of them for each layer, a draw call each: there larger tiles cost far less.
   */
  readonly cell?: number;
}

export interface City {
  readonly roads: readonly GeoLine[];
  readonly roadLayer: LineLayer;
}

export async function drawCity(s: GeoSketch, data: GeoFile, options: CityOptions): Promise<City> {
  const CELL = options.cell ?? DEFAULT_CELL;
  const u = s.unit;
  const green = makeAreas(data.areas.green ?? [], u, s.geo);
  setClass(green.palette, GREEN.park, '#0f2622');
  setClass(green.palette, GREEN.wood, '#0c201c');
  setClass(green.palette, GREEN.meadow, '#11241f');
  s.add(green.mesh);

  const yards = makeAreas(data.areas.railyard ?? [], u, s.geo);
  setClass(yards.palette, 0, '#0e0f16');
  s.add(yards.mesh);

  const water = makeAreas(data.areas.water ?? [], u, s.geo);
  setClass(water.palette, 0, WATER);
  s.add(water.mesh);

  const plazas = makeAreas(data.areas.plaza ?? [], u, s.geo);
  s.add(plazas.mesh);
  await breathe();

  const riverLines = data.lines.river ?? [];
  const rivers = makeLines(riverLines, u, { minPx: 1.4, cell: CELL }, s.geo);
  for (let c = 0; c < 3; c++) setClass(rivers.palette, c, '#13305c');
  s.add(rivers.mesh);
  const shine = makeLines(riverLines, u, { minPx: 0.7, widthScale: 0.18, cell: CELL }, s.geo);
  for (let c = 0; c < 3; c++) setClass(shine.palette, c, RIVER_SHINE, 0.7);
  s.add(shine.mesh);

  const railLines = data.lines.rail ?? [];
  const bed = makeLines(railLines, u, { minPx: 1, widthScale: 2.4, cell: CELL }, s.geo);
  setClass(bed.palette, RAIL.main, '#232838');
  setClass(bed.palette, RAIL.service, '#1d2130');
  setClass(bed.palette, RAIL.tram, '#1d2130');
  s.add(bed.mesh);
  const steel = makeLines(railLines, u, { minPx: 0.7, widthScale: 0.3, thinDim: 0.3, cell: CELL }, s.geo);
  setClass(steel.palette, RAIL.main, '#6a7594', 0.9);
  setClass(steel.palette, RAIL.service, '#525b75', 0.75);
  setClass(steel.palette, RAIL.tram, '#525b75', 0.75);
  s.add(steel.mesh);
  await breathe();

  const roads = data.lines.road ?? [];
  // The glow first: soft and wide, it piles up where the streets are dense.
  const glow = options.glow ? makeLines(roads, u, { minPx: 9, widthScale: 4, soft: 1, opacity: 0.05, cell: CELL }, s.geo) : null;
  if (glow) {
    for (let cls = 0; cls < 16; cls++) setClass(glow.palette, cls, '#ff9d45', cls % 8 <= 2 ? 1 : 0.6);
    s.add(glow.mesh);
  }
  const roadLayer = makeLines(roads, u, { minPx: options.minPx, thinDim: options.thinDim, cell: CELL }, s.geo);
  s.add(roadLayer.mesh);
  const lamplight = makeLines(roads, u, { minPx: 1, widthScale: 0.14, thinDim: 0.55, cell: CELL }, s.geo);
  s.add(lamplight.mesh);

  s.every((frame: LevelFrame) => {
    paintRoads(roadLayer.palette, frame.e);
    paintRoads(plazas.palette, frame.e);
    paintLamplight(lamplight.palette, frame.e);
    // When the device struggles the glow is dimmed, never thinned: that would drop whole districts.
    glow?.setOpacity(0.05 * cityGlow(frame.e) * (0.4 + 0.6 * frame.quality));
  });
  return { roads, roadLayer };
}

// ───────────────────────────────────────────────────────────────────────────── made-up lights

/** How far from her the made-up lights go, metres. */
const LIGHTS_RADIUS = 1500;

const lightsCache = new WeakMap<GeoFile, { windows: CityLight[]; lamps: CityLight[] }>();

/** The lights around her, drawn once from the detailed map of Rifredi and shared by two levels. */
function nearLights(rifredi: GeoFile): { windows: CityLight[]; lamps: CityLight[] } {
  let lights = lightsCache.get(rifredi);
  if (!lights) {
    const blocked = [...(rifredi.areas.water ?? []), ...(rifredi.areas.green ?? []), ...(rifredi.areas.railyard ?? [])];
    lights = cityLights(rifredi.lines.road ?? [], blocked, { radius: LIGHTS_RADIUS });
    // In a fixed random order: when the device struggles, a share is dropped here and
    // there, never a whole street.
    shuffle(lights.windows);
    shuffle(lights.lamps);
    lightsCache.set(rifredi, lights);
  }
  return lights;
}

function shuffle<T>(list: T[]): void {
  let seed = 977;
  const next = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const t = list[i] as T;
    list[i] = list[j] as T;
    list[j] = t;
  }
}

/** Lit windows: sharp dots near by, a glitter farther away, gone when the whole town is in view. */
export function windowsLook(e: number): number {
  return (0.3 + 0.7 * (1 - smoothstep(2.4, 3.1, e))) * (1 - smoothstep(3.1, 3.6, e));
}

/**
 * Lamps with their pools of light (only `rifredi`: they are additive) and lit windows
 * (`rifredi` and `quartiere`, identical: they fade into one another).
 */
export async function drawNearLights(s: GeoSketch, rifredi: GeoFile, withLamps: boolean): Promise<void> {
  const u = s.unit;
  const { windows, lamps } = nearLights(rifredi);
  await breathe();
  const layers: LineLayer[] = [];
  if (withLamps) {
    const pools = makeLights(lamps, u, { minPx: 3, soft: 1, additive: true, opacity: 0.32 }, s.geo);
    setClass(pools.palette, LIGHT.lamp, '#ffae5c');
    s.add(pools.mesh);
    const heads = makeLights(
      lamps.map((l) => ({ ...l, radius: 0.32 })),
      u,
      { minPx: 1.3, soft: 0 },
      s.geo,
    );
    setClass(heads.palette, LIGHT.lamp, '#ffe2b0');
    s.add(heads.mesh);
    s.every((frame) => {
      const near = 1 - smoothstep(2.6, 3.4, frame.e);
      pools.setOpacity(0.32 * near);
      heads.setOpacity(near);
    });
    layers.push(pools, heads);
  }
  // Windows: short warm dashes along the fronts of the houses.
  const dashes = windows.map((w) => ({
    cls: w.cls,
    width: 0.32,
    points: new Float64Array([w.x - w.dx * w.radius, w.y - w.dy * w.radius, w.x + w.dx * w.radius, w.y + w.dy * w.radius]),
  }));
  const lit = makeLines(dashes, u, { minPx: 1.2 }, s.geo);
  setClass(lit.palette, LIGHT.warm, '#ffbf66');
  setClass(lit.palette, LIGHT.white, '#ffe6c2');
  setClass(lit.palette, LIGHT.cool, '#a9c2ff', 0.8);
  s.add(lit.mesh);
  layers.push(lit);
  s.every((frame) => {
    lit.setOpacity(windowsLook(frame.e));
    for (const layer of layers) layer.setShare(frame.quality);
  });
}
