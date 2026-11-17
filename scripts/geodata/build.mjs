#!/usr/bin/env node
/**
 * Builds the geographic data of the stops of M2 into public/data/, once, on this machine:
 *
 *   node scripts/geodata/build.mjs             everything (downloads go to scripts/geodata/cache/)
 *
 * Output (committed): rifredi.json, city.json, toscana.json, italia.json. Coordinates are in
 * metres from the starting point (orthographic projection), quantized; no names, no tags
 * beyond the class of each feature. The format is decoded by src/levels/geo/format.ts.
 * The night lights are made by black-marble.mjs.
 *
 * Sources: OpenStreetMap (© OpenStreetMap contributors, ODbL) for the city, the Arno and the
 * motorways; Natural Earth 1:10m (public domain) for coasts, borders and the region.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  assembleRings,
  bounds,
  boxesOverlap,
  cachedDownload,
  clipLine,
  clipRing,
  encodePoints,
  makeProjection,
  projectAll,
  readJson,
  readOrigin,
  simplify,
  simplifyRing,
  writeOut,
} from './common.mjs';
import { areaRings, cityQuery, isPrivate, overpass, overpassTiled, pathsQuery, placesQuery, regionQuery, tags } from './osm.mjs';

async function mustOverpass(name, query) {
  const data = await overpass(name, query);
  if (!data) throw new Error(`Overpass: «${name}» non scarica, riprova più tardi`);
  return data;
}

const origin = readOrigin();
const proj = makeProjection(origin);

/** Bounding box of the city download (south, west, north, east): Florence and its first ring. */
const CITY_BOX = [43.71, 11.13, 43.85, 11.36];

/** Official geometry of Virgo (LIGO/Virgo detector constants): vertex, arm azimuths east of north, 3 km arms. */
const VIRGO = { lat: 43.6314142, lon: 10.5044967, arms: [19.4326, 289.4326], length: 3000 };

/** Natural Earth 1:10m, GeoJSON, from the official repository at a fixed version. */
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';

// ───────────────────────────────────────────────────────────── classes (keep in sync with src/levels/geo/format.ts)

const ROAD_CLASS = {
  motorway: 0, motorway_link: 0, trunk: 0, trunk_link: 0,
  primary: 1, primary_link: 1,
  secondary: 2, secondary_link: 2,
  tertiary: 3, tertiary_link: 3,
  unclassified: 4, residential: 4, living_street: 4,
  pedestrian: 5,
};
/** Carriageway width in metres when OSM does not say. */
const ROAD_WIDTH = [20, 12, 10, 8, 6, 6, 2, 4];
/** Footways, paths and steps (class 6) and public service lanes (class 7): only in rifredi.json. */
const PATH = 6;
const SERVICE = 7;
const BRIDGE = 8;
const PARKING_WIDTH = { parallel: 2.2, diagonal: 4.5, perpendicular: 5 };

function roadWidth(t, cls) {
  const tagged = parseFloat(t.width);
  if (Number.isFinite(tagged) && tagged > 1 && tagged < 60) return tagged;
  const lanes = parseInt(t.lanes, 10);
  let width = Number.isFinite(lanes) && lanes > 0 ? lanes * 3.2 : ROAD_WIDTH[cls];
  for (const side of ['left', 'right']) {
    const orientation = t[`parking:${side}:orientation`] ?? t['parking:both:orientation'];
    const lane = t[`parking:${side}`] ?? t['parking:both'];
    if (lane === 'lane' || lane === 'street_side') width += PARKING_WIDTH[orientation] ?? PARKING_WIDTH.parallel;
  }
  return width;
}

const tunnel = (t) => t.tunnel && t.tunnel !== 'no';

// ───────────────────────────────────────────────────────────── features from OSM

function extractCity(osm) {
  const roads = [];
  const rails = [];
  const rivers = [];
  const water = [];
  const green = [];
  const railyards = [];
  const plazas = [];
  for (const e of osm.elements) {
    const t = tags(e);
    if (isPrivate(e)) continue;
    if (e.type === 'way' && t.highway in ROAD_CLASS && !tunnel(t)) {
      if (t.area === 'yes') {
        if (t.highway === 'pedestrian') plazas.push({ cls: 0, ...areaRings(e, assembleRings) });
        continue;
      }
      const cls = ROAD_CLASS[t.highway];
      const bridge = t.bridge && t.bridge !== 'no';
      roads.push({ cls: cls + (bridge ? BRIDGE : 0), width: roadWidth(t, cls), line: e.geometry });
    } else if (e.type === 'way' && /^(rail|light_rail|tram)$/.test(t.railway ?? '') && !tunnel(t)) {
      const cls = t.railway === 'rail' ? (t.service ? 1 : 0) : 2;
      rails.push({ cls, width: cls === 2 ? 1.4 : 1.435, line: e.geometry });
    } else if (e.type === 'way' && /^(river|stream|canal)$/.test(t.waterway ?? '') && !tunnel(t)) {
      const cls = { river: 0, stream: 1, canal: 2 }[t.waterway];
      const tagged = parseFloat(t.width);
      rivers.push({ cls, width: Number.isFinite(tagged) ? tagged : [25, 4, 4][cls], line: e.geometry });
    } else if (t.natural === 'water' || t.waterway === 'riverbank') {
      water.push({ cls: 0, ...areaRings(e, assembleRings) });
    } else if (t.leisure === 'park') {
      green.push({ cls: 0, ...areaRings(e, assembleRings) });
    } else if (t.landuse === 'forest' || t.natural === 'wood') {
      green.push({ cls: 1, ...areaRings(e, assembleRings) });
    } else if (t.landuse === 'meadow') {
      green.push({ cls: 2, ...areaRings(e, assembleRings) });
    } else if (t.landuse === 'railway') {
      railyards.push({ cls: 0, ...areaRings(e, assembleRings) });
    }
  }
  return { roads, rails, rivers, water, green, railyards, plazas };
}

// ───────────────────────────────────────────────────────────── encoding of layers

/** Lines: [cls, width in dm, x0, y0, dx1, dy1, …] in steps of q. */
function encodeLines(features, { box, q, tolerance }) {
  const out = [];
  for (const f of features) {
    const points = f.points ?? projectAll(proj, f.line);
    if (points.length < 2 || !boxesOverlap(bounds(points), box)) continue;
    for (const piece of clipLine(points, box)) {
      const simple = simplify(piece, tolerance);
      const coords = encodePoints(simple, q);
      if (coords.length >= 4) out.push([f.cls, Math.round((f.width ?? 0) * 10), ...coords]);
    }
  }
  return out;
}

/** Areas: [cls, ring, ring, …], each ring [x0, y0, dx1, dy1, …]; the first ring is outer, the others holes. */
function encodeAreas(features, { box, q, tolerance }) {
  const out = [];
  for (const f of features) {
    const holes = (f.inner ?? []).map((r) => projectAll(proj, r));
    for (const outerRaw of f.outer ?? []) {
      const outer = f.projected ? outerRaw : projectAll(proj, outerRaw);
      if (outer.length < 4 || !boxesOverlap(bounds(outer), box)) continue;
      const clipped = clipRing(outer, box);
      const ring = clipped && simplifyRing(clipped, tolerance);
      if (!ring) continue;
      const rings = [encodePoints(ring, q)];
      const ob = bounds(ring);
      for (const hole of holes) {
        if (!boxesOverlap(bounds(hole), ob)) continue;
        const h = clipRing(hole, box);
        const hs = h && simplifyRing(h, tolerance);
        if (hs) rings.push(encodePoints(hs, q));
      }
      out.push([f.cls, ...rings]);
    }
  }
  return out;
}

const boxAround = (cx, cy, half) => [cx - half, cy - half, cx + half, cy + half];

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

const round = (v, q) => Math.round(v / q) * q;

/**
 * The street in front of the starting point: the nearest road to it. The scenes `partenza`
 * and `strada` draw their kerb where the real carriageway is.
 */
function streetInFront(roads) {
  let best = null;
  for (const r of roads) {
    if ((r.cls & 7) > 4) continue;
    const pts = projectAll(proj, r.line);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      const foot = [ax + t * dx, ay + t * dy];
      const d = Math.hypot(foot[0], foot[1]);
      if (!best || d < best.distance) best = { distance: d, foot, dir: [dx / Math.sqrt(len2), dy / Math.sqrt(len2)], width: r.width };
    }
  }
  if (!best) throw new Error('Nessuna strada vicino al punto di partenza');
  // Direction pointing to the left of the view from the street (any sign is fine: it is an axis).
  const angle = (Math.atan2(best.dir[1], best.dir[0]) * 180) / Math.PI;
  return {
    /** Nearest point of the centre line of the carriageway, in metres from the starting point. */
    centre: [round(best.foot[0], 0.01), round(best.foot[1], 0.01)],
    /** Angle of the street axis on screen, in degrees from +x (east), counter-clockwise. */
    angle: round(((angle % 180) + 180) % 180, 0.01),
    /** Width of the carriageway, parking lanes included, in metres. */
    width: round(best.width, 0.1),
  };
}

// ───────────────────────────────────────────────────────────── the files

async function buildCity() {
  console.log('Città (OpenStreetMap)');
  const lines = await overpassTiled('city-lines', CITY_BOX, (box) => cityQuery(box, 'lines'));
  const areasOsm = await overpassTiled('city-areas', CITY_BOX, (box) => cityQuery(box, 'areas'), 2);
  const osm = { elements: [...lines.elements, ...areasOsm.elements] };
  const places = await mustOverpass('places', placesQuery());
  const f = extractCity(osm);
  // Pavements and lanes around the starting point, for the detailed map only.
  const nearBox = [proj.inverse(-2300, -2300), proj.inverse(2300, 2300)];
  const pathsOsm = await overpassTiled('paths', [nearBox[0][0], nearBox[0][1], nearBox[1][0], nearBox[1][1]].map((v) => +v.toFixed(5)), pathsQuery, 2);
  const paths = [];
  for (const e of pathsOsm.elements) {
    const t = tags(e);
    if (e.type !== 'way' || isPrivate(e) || tunnel(t) || t.area === 'yes' || !e.geometry) continue;
    if (t.highway === 'service') paths.push({ cls: SERVICE, width: roadWidth(t, SERVICE), line: e.geometry });
    else paths.push({ cls: PATH, width: Number.isFinite(parseFloat(t.width)) ? parseFloat(t.width) : 2, line: e.geometry });
  }
  const placeElements = places.elements;
  const duomo = placeElements.find((e) => tags(e).building === 'cathedral');
  const station = placeElements.find((e) => e.type === 'node');
  const officine = placeElements.find((e) => tags(e).landuse === 'brownfield');
  if (!duomo || !station || !officine) throw new Error('Mancano Duomo, stazione o ex Officine nei dati OSM');
  const duomoRing = projectAll(proj, duomo.geometry);
  const officineRing = projectAll(proj, officine.geometry);
  // A point on the Arno at the Ponte Vecchio, for the label of the river.
  const arno = proj.forward(43.76795, 11.25313);

  // The street in front of her, for the first two scenes: a tiny module, so that the very
  // first level does not have to download the map of Rifredi.
  const street = streetInFront(f.roads);
  fs.writeFileSync(
    path.join(ROOT, 'src', 'content', 'street.ts'),
    `/**
 * The street in front of the starting point, measured on OpenStreetMap: \`partenza\` and
 * \`strada\` are drawn along it, so that they meet the real map of \`rifredi\` without a jump.
 * Generated by scripts/geodata/build.mjs: do not edit by hand.
 */
export const STREET = {
  /** Nearest point of the centre line of the carriageway, metres from the starting point (+x east, +y north). */
  centre: [${street.centre[0]}, ${street.centre[1]}],
  /** Angle of the street axis on screen, degrees from +x (east), counter-clockwise, in [0, 180). */
  angle: ${street.angle},
  /** Width of the carriageway, parking lanes included, in metres. */
  width: ${street.width},
} as const;
`,
  );
  console.log('  src/content/street.ts');

  // rifredi: everything around the starting point, at true width.
  const near = { box: boxAround(0, 0, 2200), q: 0.1, tolerance: 0.25 };
  writeOut('rifredi.json', {
    v: 1,
    q: near.q,
    box: near.box,
    street,
    lines: {
      road: encodeLines([...f.roads, ...paths], near),
      rail: encodeLines(f.rails, near),
      river: encodeLines(f.rivers, near),
    },
    areas: {
      water: encodeAreas(f.water, near),
      green: encodeAreas(f.green, near),
      railyard: encodeAreas(f.railyards, near),
      plaza: encodeAreas(f.plazas, near),
    },
  });

  // city: the whole download, for `quartiere` and `firenze`.
  const corners = [proj.forward(CITY_BOX[0], CITY_BOX[1]), proj.forward(CITY_BOX[2], CITY_BOX[3]), proj.forward(CITY_BOX[0], CITY_BOX[3]), proj.forward(CITY_BOX[2], CITY_BOX[1])];
  const [x0, y0, x1, y1] = bounds(corners);
  const city = { box: [Math.ceil(x0), Math.ceil(y0), Math.floor(x1), Math.floor(y1)], q: 0.5, tolerance: 1.2 };
  writeOut('city.json', {
    v: 1,
    q: city.q,
    box: city.box,
    lines: {
      road: encodeLines(f.roads, city),
      rail: encodeLines(f.rails, city),
      river: encodeLines(f.rivers, city),
    },
    areas: {
      water: encodeAreas(f.water, city),
      green: encodeAreas(f.green, { ...city, tolerance: 2.5 }),
      railyard: encodeAreas(f.railyards, city),
      plaza: encodeAreas(f.plazas, city),
      duomo: [[0, encodePoints(duomoRing.slice(0, -1), city.q)]],
      officine: [[0, encodePoints(officineRing.slice(0, -1), city.q)]],
    },
    points: {
      duomo: centroid(duomoRing.slice(0, -1)).map((v) => round(v, 1)),
      station: proj.forward(station.lat, station.lon).map((v) => round(v, 1)),
      officine: centroid(officineRing.slice(0, -1)).map((v) => round(v, 1)),
      arno: arno.map((v) => round(v, 1)),
    },
  });
}

/** Natural Earth features as rings or lines of [lon, lat], cut to a lon/lat window first. */
function neGeometries(geojson, filter = () => true) {
  const out = [];
  for (const feature of geojson.features) {
    if (!filter(feature.properties ?? {})) continue;
    const g = feature.geometry;
    if (!g) continue;
    const parts = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : g.type === 'LineString' ? [[g.coordinates]] : g.type === 'MultiLineString' ? g.coordinates.map((l) => [l]) : [];
    for (const part of parts) out.push({ type: g.type.includes('Polygon') ? 'area' : 'line', rings: part, props: feature.properties });
  }
  return out;
}

/**
 * The outline of a group of polygons that share their borders (the provinces of a region):
 * the edges that two polygons have in common cancel out, the others are chained into lines
 * of [lon, lat].
 */
function dissolveOutline(list) {
  const key = (p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
  const edges = new Map();
  for (const item of list) {
    if (item.type !== 'area') continue;
    for (const ring of item.rings) {
      for (let i = 1; i < ring.length; i++) {
        const a = key(ring[i - 1]);
        const b = key(ring[i]);
        if (a === b) continue;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        const e = edges.get(k);
        if (e) e.count++;
        else edges.set(k, { count: 1, a: ring[i - 1], b: ring[i] });
      }
    }
  }
  const next = new Map();
  for (const e of edges.values()) {
    if (e.count !== 1) continue;
    for (const [from, to] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      const list2 = next.get(key(from)) ?? [];
      list2.push(to);
      next.set(key(from), list2);
    }
  }
  const used = new Set();
  const lines = [];
  for (const [start, targets] of next) {
    for (const first of targets) {
      const k0 = [start, key(first)].sort().join('|');
      if (used.has(k0)) continue;
      used.add(k0);
      const line = [start.split(',').map(Number), first];
      let current = first;
      for (;;) {
        const options = (next.get(key(current)) ?? []).filter((p) => !used.has([key(current), key(p)].sort().join('|')));
        if (options.length === 0) break;
        const p = options[0];
        used.add([key(current), key(p)].sort().join('|'));
        line.push(p);
        current = p;
      }
      lines.push({ type: 'line', rings: [line] });
    }
  }
  return lines;
}

/** Natural Earth polygons → projected area features, pre-cut to a lon/lat window so no point falls on the far side. */
function neAreas(list, window, cls) {
  const out = [];
  for (const item of list) {
    if (item.type !== 'area') continue;
    const [outer, ...holes] = item.rings;
    const cut = clipRing(outer, window);
    if (!cut) continue;
    out.push({ cls, projected: true, outer: [projectAll(proj, cut, true)], inner: holes.map((h) => clipRing(h, window)).filter(Boolean).map((h) => h.map(([lon, lat]) => ({ lat, lon }))) });
  }
  return out;
}

function neLines(list, window, cls) {
  const out = [];
  for (const item of list) {
    if (item.type !== 'line') continue;
    for (const piece of clipLine(item.rings[0], window)) out.push({ cls, points: projectAll(proj, piece, true) });
  }
  return out;
}

async function buildRegions() {
  console.log('Toscana e Italia (Natural Earth, OpenStreetMap)');
  const load = async (name) => readJson(await cachedDownload(`${NE}${name}.geojson`, `${name}.geojson`));
  const land = neGeometries(await load('ne_10m_land'));
  const coast = neGeometries(await load('ne_10m_coastline'));
  const lakes = neGeometries(await load('ne_10m_lakes'));
  const borders = neGeometries(await load('ne_10m_admin_0_boundary_lines_land'));
  const regionsAll = await load('ne_10m_admin_1_states_provinces');
  // In Natural Earth the Italian features are provinces: Tuscany is the ten with region IT-52.
  const tuscany = neGeometries(regionsAll, (p) => p.adm0_a3 === 'ITA' && p.region_cod === 'IT-52');
  const tuscanyOutline = dissolveOutline(tuscany);
  if (tuscany.length === 0) throw new Error('Toscana non trovata in Natural Earth');
  const places = await load('ne_10m_populated_places_simple');
  const place = (name) => {
    const f = places.features.find((x) => x.properties.name === name && x.properties.adm0name === 'Italy');
    if (!f) throw new Error(`${name} non trovata in Natural Earth`);
    const [lon, lat] = f.geometry.coordinates;
    return proj.forward(lat, lon).map((v) => round(v, 10));
  };

  const region = await mustOverpass('region', regionQuery());
  const arno = [];
  const motorways = [];
  for (const e of region.elements) {
    const t = tags(e);
    if (e.type !== 'way' || !e.geometry) continue;
    if (t.highway === 'motorway' || t.highway === 'trunk') {
      if (!tunnel(t)) motorways.push({ cls: t.highway === 'motorway' ? 0 : 1, line: e.geometry });
    } else if (t.waterway === 'river' || t.waterway === 'canal' || !t.highway) {
      arno.push({ cls: 0, line: e.geometry });
    }
  }

  // toscana: from the sea to beyond Florence.
  const lonLatT = [8.5, 41.5, 13.5, 45.5];
  const t = { box: [-330e3, -280e3, 250e3, 230e3], q: 20, tolerance: 120 };
  const virgo = proj.forward(VIRGO.lat, VIRGO.lon);
  const arm = (azimuth) => {
    const a = (azimuth * Math.PI) / 180;
    return [virgo[0] + VIRGO.length * Math.sin(a), virgo[1] + VIRGO.length * Math.cos(a)];
  };
  writeOut('toscana.json', {
    v: 1,
    q: t.q,
    box: t.box,
    lines: {
      coast: encodeLines(neLines(coast, lonLatT, 0), t),
      arno: encodeLines(arno, { ...t, tolerance: 40 }),
      road: encodeLines(motorways, { ...t, tolerance: 60 }),
      border: encodeLines(neLines(borders, lonLatT, 0), t),
      region: encodeLines(neLines(tuscanyOutline, lonLatT, 0), { ...t, tolerance: 80 }),
    },
    areas: {
      land: encodeAreas(neAreas(land, lonLatT, 0), t),
      lake: encodeAreas(neAreas(lakes, lonLatT, 0), t),
      region: encodeAreas(neAreas(tuscany, lonLatT, 0), t),
    },
    points: {
      firenze: place('Florence'),
      pisa: place('Pisa'),
      virgo: virgo.map((v) => round(v, 1)),
      virgoNorth: arm(VIRGO.arms[0]).map((v) => round(v, 1)),
      virgoWest: arm(VIRGO.arms[1]).map((v) => round(v, 1)),
    },
  });

  // italia: the peninsula and what is around it, wide enough to fill the screen at 10^6.1 m and beyond.
  const lonLatI = [-8, 28, 32, 58];
  const i = { box: [-2000e3, -2100e3, 2200e3, 1700e3], q: 200, tolerance: 700 };
  writeOut('italia.json', {
    v: 1,
    q: i.q,
    box: i.box,
    lines: {
      coast: encodeLines(neLines(coast, lonLatI, 0), i),
      border: encodeLines(neLines(borders, lonLatI, 0), i),
      region: encodeLines(neLines(tuscanyOutline, lonLatI, 0), { ...i, tolerance: 400 }),
    },
    areas: {
      land: encodeAreas(neAreas(land, lonLatI, 0), i),
      lake: encodeAreas(neAreas(lakes, lonLatI, 0), { ...i, tolerance: 400 }),
      region: encodeAreas(neAreas(tuscany, lonLatI, 0), { ...i, tolerance: 400 }),
    },
  });
}

await buildCity();
await buildRegions();
console.log('Fatto. Ora: node scripts/geodata/black-marble.mjs, poi node scripts/geodata/check-privacy.mjs');
