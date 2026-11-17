/**
 * OpenStreetMap through the Overpass API: few requests, once, cached in cache/.
 * Data © OpenStreetMap contributors, ODbL (see CREDITS.md).
 *
 * Queries are by bounding box only: the name of the street of the starting point is never
 * sent anywhere.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, sleep } from './common.mjs';

/** Public Overpass servers, tried in turn: the main one is often at capacity. */
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/**
 * Runs `query` once and caches the answer as cache/osm-<name>.json. It uses curl: a large
 * query can take minutes before the first byte, longer than fetch() waits.
 * Returns null after `attempts` failures (the caller may split the request).
 */
export async function overpass(name, query, attempts = 16) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `osm-${name}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const queryFile = path.join(CACHE, `osm-${name}.query`);
  const part = `${file}.part`;
  fs.writeFileSync(queryFile, query);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const server = SERVERS[attempt % SERVERS.length];
    console.log(`  Overpass «${name}» (${new URL(server).host}, tentativo ${attempt + 1})`);
    try {
      execFileSync('curl', ['-sS', '-m', '400', '-A', 'dieci-geodata/1.0 (one-off script)', '--data-urlencode', `data@${queryFile}`, '-o', part, server]);
      const text = fs.readFileSync(part, 'utf8');
      if (!text.startsWith('{')) throw new Error(text.slice(0, 160).replace(/\s+/g, ' '));
      const data = JSON.parse(text);
      if (data.remark && /error|timed out|out of memory/i.test(data.remark)) throw new Error(data.remark);
      fs.renameSync(part, file);
      fs.rmSync(queryFile);
      console.log(`    ${data.elements.length} elementi`);
      return data;
    } catch (error) {
      console.log(`    non riuscito: ${String(error.message).split('\n')[0]}`);
      await sleep(15000 * Math.min(attempt + 1, 3));
    }
  }
  fs.rmSync(queryFile, { force: true });
  fs.rmSync(part, { force: true });
  return null;
}

const bbox = ([south, west, north, east]) => `${south},${west},${north},${east}`;

/**
 * What the city scenes need, in two requests (smaller requests are less likely to time out):
 * `lines` (roads, rails, rivers) and `areas` (water, green, railway land).
 */
export function cityQuery(box, part) {
  const b = bbox(box);
  const body =
    part === 'lines'
      ? `way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian)$"](${b});
  way["railway"~"^(rail|light_rail|tram)$"](${b});
  way["waterway"~"^(river|stream|canal)$"](${b});`
      : `way["landuse"="railway"](${b});
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["waterway"="riverbank"](${b});
  relation["waterway"="riverbank"](${b});
  way["leisure"="park"](${b});
  relation["leisure"="park"](${b});
  way["landuse"~"^(forest|meadow)$"](${b});
  relation["landuse"="forest"](${b});
  way["natural"="wood"](${b});
  relation["natural"="wood"](${b});`;
  return `[out:json][timeout:240];
(
  ${body}
);
out geom;`;
}

/**
 * A large box in tiles, one light request each (busy servers refuse heavy ones), merged and
 * without duplicates. Each tile is cached on its own, so an interrupted run resumes; a tile
 * that keeps failing is split in four, down to three levels.
 */
export async function overpassTiled(name, box, makeQuery, tiles = 3) {
  const seen = new Set();
  const elements = [];
  const take = (data) => {
    for (const e of data.elements) {
      const key = `${e.type}/${e.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push(e);
    }
  };
  const fetchTile = async (tileName, tile, depth) => {
    const data = await overpass(tileName, makeQuery(tile), depth >= 3 ? 24 : 4);
    if (data) return take(data);
    if (depth >= 3) throw new Error(`Overpass: il riquadro ${tileName} non scarica`);
    for (const [k, sub] of split(tile, 2).entries()) await fetchTile(`${tileName}-${k}`, sub, depth + 1);
  };
  for (const [k, tile] of split(box, tiles).entries()) {
    const i = Math.floor(k / tiles);
    const j = k % tiles;
    await fetchTile(`${name}-${i}${j}`, tile, 0);
  }
  return { elements };
}

function split([south, west, north, east], n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out.push([
        +(south + ((north - south) * i) / n).toFixed(5),
        +(west + ((east - west) * j) / n).toFixed(5),
        +(south + ((north - south) * (i + 1)) / n).toFixed(5),
        +(west + ((east - west) * (j + 1)) / n).toFixed(5),
      ]);
    }
  }
  return out;
}

/** Around the starting point only: pavements, footpaths and public service lanes (no driveways). */
export function pathsQuery(box) {
  const b = bbox(box);
  return `[out:json][timeout:240];
(
  way["highway"~"^(footway|path|cycleway|steps)$"](${b});
  way["highway"="service"]["service"!~"^(driveway|parking_aisle|drive-through)$"](${b});
);
out geom;`;
}

/** The few named public places of the texts: the cathedral, the station, the former Officine Galileo. */
export function placesQuery() {
  return `[out:json][timeout:120];
(
  way["building"="cathedral"](43.770,11.250,43.776,11.262);
  node["railway"="station"]["name"="Firenze Rifredi"](43.79,11.22,43.81,11.25);
  way["landuse"="brownfield"]["alt_name"="Ex Officine Galileo"](43.79,11.23,43.80,11.25);
);
out geom;`;
}

/** The whole Arno (the river as a line) and the motorways of Tuscany. */
export function regionQuery() {
  return `[out:json][timeout:300];
(
  relation["waterway"="river"]["name"="Arno"](43.0,9.9,44.0,12.0);
  way(r);
  way["highway"~"^(motorway|trunk)$"](42.2,9.6,44.6,12.6);
);
out geom;`;
}

/** Tags of a way or relation, never undefined. */
export const tags = (e) => e.tags ?? {};

/** True for things mapped as private: never drawn. */
export function isPrivate(e) {
  const t = tags(e);
  return t.access === 'private' || t.access === 'no';
}

/** The outer and inner rings of a closed way or a multipolygon relation, as arrays of {lat, lon}. */
export function areaRings(e, assembleRings) {
  if (e.type === 'way') {
    const g = e.geometry ?? [];
    if (g.length < 4) return { outer: [], inner: [] };
    const closed = g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
    return { outer: closed ? [g] : [], inner: [] };
  }
  const members = (e.members ?? []).filter((m) => m.type === 'way' && m.geometry);
  return {
    outer: assembleRings(members.filter((m) => m.role !== 'inner').map((m) => m.geometry)),
    inner: assembleRings(members.filter((m) => m.role === 'inner').map((m) => m.geometry)),
  };
}
