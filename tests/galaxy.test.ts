import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCAL_DWARFS, LOCAL_GIANTS, MILKY_WAY, NEBULAE } from '../src/content/cosmos.ts';
import { ANCHORS, LY } from '../src/engine/stage.ts';
import { armLevel, armStars, milkyWayLook, spiralPhase } from '../src/levels/galaxy.ts';
import { galacticLonLat, stageFromGalactic } from '../src/levels/sky.ts';

const near = (actual: number, expected: number, tolerance: number, message?: string): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ''} expected ${expected} ± ${tolerance}, got ${actual}`);
};

const look = milkyWayLook(1);
const sunR = MILKY_WAY.sunFromCentreLy / MILKY_WAY.radiusLy;

test('the Sun is on the Local Arm, half-way between Sagittarius–Carina and Perseus', () => {
  const sun = armLevel(look, 0, -sunR);
  assert.ok(sun.spur > 0.95, `spur at the Sun: ${sun.spur}`);
  // Along the line from the centre through the Sun: the nearest arm inside is a minor one
  // (Sagittarius–Carina), the nearest outside a major one (Perseus).
  const peak = (from: number, to: number, which: 'major' | 'minor'): number => {
    let best = from;
    let value = -1;
    for (let r = from; r <= to; r += 0.001) {
      const v = armLevel(look, 0, -r)[which];
      if (v > value) {
        value = v;
        best = r;
      }
    }
    return best;
  };
  const sagittarius = peak(0.35, sunR, 'minor');
  const perseus = peak(sunR, 0.75, 'major');
  near(sagittarius * MILKY_WAY.radiusLy, 21_500, 1_500, 'Sagittarius–Carina');
  near(perseus * MILKY_WAY.radiusLy, 30_500, 1_500, 'Perseus');
  // The Sun is within a fifth of the gap from the middle.
  near((sunR - sagittarius) / (perseus - sagittarius), 0.5, 0.1, 'half-way');
});

test('the major arms leave the ends of the bar', () => {
  const [half, , degrees] = look.bar;
  for (const end of [degrees, degrees + 180]) {
    const a = (end * Math.PI) / 180;
    const x = half * 0.9 * Math.cos(a);
    const y = half * 0.9 * Math.sin(a);
    // Within a third of an arm width of a major arm, in spiral phase.
    const s = spiralPhase(x, y, look.k);
    const d = ((((s - look.armPhase + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
    assert.ok(Math.abs(d) < look.armWidth, `bar end at ${end}°: ${d}`);
  }
  // The near end (the one closer to the Sun, at the bottom) is to the left of the Sun–centre line.
  const nearEnd = degrees + 180;
  near(nearEnd, 270 - MILKY_WAY.barAngleDeg, 1e-9);
});

test('no star sparkles in the neighbourhood of the Sun', () => {
  const stars = armStars(look, 800, 7, [0, -sunR, 0.06]);
  assert.ok(stars.length >= 1500);
  for (let i = 0; i < stars.length; i += 2) assert.ok(Math.hypot(stars[i]!, stars[i + 1]! + sunR) >= 0.06);
});

test('Andromeda is where the sky puts it, 2.5 million light-years away', () => {
  // M31: RA 00h 42m 44.3s, Dec +41° 16′ 9″.
  const { lon, lat } = galacticLonLat(0 + 42 / 60 + 44.3 / 3600, 41 + 16 / 60 + 9 / 3600);
  near(lon, LOCAL_GIANTS.andromeda.l, 0.05, 'longitude');
  near(lat, LOCAL_GIANTS.andromeda.b, 0.05, 'latitude');
  const [x, y] = stageFromGalactic(LOCAL_GIANTS.andromeda.l, LOCAL_GIANTS.andromeda.ly * LY);
  near(ANCHORS.andromeda[0] - ANCHORS.sun[0], x, LY);
  near(ANCHORS.andromeda[1] - ANCHORS.sun[1], y, LY);
  // Down and to the left of the Milky Way on screen.
  assert.ok(x < 0 && y < 0);
});

test('longitude 90° is to the left of the Sun, the galactic centre is above', () => {
  const [x90, y90] = stageFromGalactic(90, 1);
  near(x90, -1, 1e-12);
  near(y90, 0, 1e-12);
  const [x0, y0] = stageFromGalactic(0, 1);
  near(x0, 0, 1e-12);
  near(y0, 1, 1e-12);
});

test('the data of the sky are sensible', () => {
  for (const n of NEBULAE) {
    assert.ok(n.l >= 0 && n.l < 360 && n.ly > 300 && n.ly < 3000 && n.radius > 0, n.name);
  }
  // The Orion Nebula is the stage anchor.
  const orion = NEBULAE.find((n) => n.name === 'Nebulosa di Orione');
  assert.ok(orion);
  const [x, y] = stageFromGalactic(orion.l, orion.ly * LY);
  near(ANCHORS.orionNebula[0] - ANCHORS.sun[0], x, 1e-3 * LY);
  near(ANCHORS.orionNebula[1] - ANCHORS.sun[1], y, 1e-3 * LY);
  assert.ok(LOCAL_DWARFS.length >= 40, 'dozens of small galaxies');
  for (const g of LOCAL_DWARFS) assert.ok(g.ly < 3.6e6 && g.l >= 0 && g.l < 360, g.name);
  assert.ok(LOCAL_GIANTS.lmc.ly < LOCAL_GIANTS.smc.ly);
});
