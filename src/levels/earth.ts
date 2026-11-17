/**
 * The Earth, for `terra` and `luna`: a globe in three dimensions on the anchor `earth`, at
 * its true size, with the starting point in the middle of the disc.
 *
 * - It never turns: the warm dot must stay on Rifredi. So only one hemisphere is ever seen,
 *   and its pictures are made in the same orthographic projection, centred on the starting
 *   point, as every map of M2 (scripts/geodata/globe.mjs): the shader reads them with
 *   uv = p.xy / R, and the globe lies exactly under the map of `italia`.
 * - Italy is in the night, in the middle; the Sun is on the side of SUNLIGHT and a little
 *   behind the Earth (EARTH_LIGHT), so a crescent of day shines on that side: the Earth of
 *   November (Blue Marble), clouds, the glint of the Sun on the sea, the warm band of the
 *   twilight, the thin blue line of the air on the limb.
 * - The night: the same deep blue as the sea under `italia`, the lights of NASA Black Marble
 *   in the same colours as `toscana` and `italia` (NIGHT_STYLE), faint cool coasts.
 * - The clouds drift very slowly (they stand still with ?static=1).
 *
 * Hand-over with `italia`: the map of Italy is flat, the globe is round, and seen from
 * close by they differ by a few pixels; the globe's picture is also coarser. So the globe's
 * lights, coasts and the contrast of land and sea come in only from 10^6.6 to 10^7.05
 * (`globeLook`), when the two agree to the pixel; before, under the map, the globe is the
 * plain deep blue that `italia` was designed on.
 */
import {
  AdditiveBlending,
  Color,
  FrontSide,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type DataTexture,
  type Texture,
} from 'three';
import type { LevelFrame } from '../engine/level.ts';
import { ANCHORS, EARTH_RADIUS, type Vec3 } from '../engine/stage.ts';
import type { AsyncSketch } from './async-sketch.ts';
import { SUNLIGHT } from './placeholder/bodies.ts';
import { acquire, loadColorTexture, packGreyTextures } from './textures.ts';
import { NIGHT_STYLE } from './toscana.ts';

/** How far behind the Earth the Sun is, seen from the camera: Italy is in the night. */
const SUN_BEHIND = (26 * Math.PI) / 180;

/**
 * Unit vector towards the Sun, in the axes of the stage (+z towards the camera). The Moon
 * in its lens is lit by the same light.
 */
export const EARTH_LIGHT: Vec3 = [SUNLIGHT[0] * Math.cos(SUN_BEHIND), SUNLIGHT[1] * Math.cos(SUN_BEHIND), -Math.sin(SUN_BEHIND)];

/**
 * The axis of the Earth (towards the north pole) as seen from above the starting point:
 * north is up on the screen, and the pole is tilted towards the camera by the latitude
 * (rounded to Florence's, 44°). Used only to let the clouds drift.
 */
const HOME_LATITUDE = (44 * Math.PI) / 180;
const AXIS = new Vector3(0, Math.cos(HOME_LATITUDE), Math.sin(HOME_LATITUDE));

/** How fast the clouds drift around the axis, radians a second (about 3° a minute). */
const CLOUD_DRIFT = 0.0009;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** What the night side of the globe shows at exponent `e` (see the note at the top). */
export function globeLook(e: number): { lights: number; coast: number; land: number; nightClouds: number } {
  return {
    lights: smoothstep(6.6, 6.95, e),
    coast: smoothstep(6.75, 7.05, e),
    land: smoothstep(6.6, 7.0, e),
    nightClouds: smoothstep(6.9, 7.3, e),
  };
}

/** The deep blue under the map of `italia` (the sea at night), and the land a shade lighter. */
const SEA_AT_NIGHT = '#0a1736';
const LAND_AT_NIGHT = '#0f1b3d';
const COAST = '#3d5290';

const VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vWorld;
  void main() {
    vPos = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const GLOBE_FRAGMENT = /* glsl */ `
  uniform sampler2D uDay;     // colour by day (sRGB)
  uniform sampler2D uData;    // r: lights, g: clouds, b: land
  uniform vec3 uSun;          // unit vector towards the Sun
  uniform vec3 uAxis;         // the axis of the Earth
  uniform float uCloudTurn;   // radians the clouds have drifted
  uniform float uFade;
  uniform float uPixelRatio;
  uniform float uLights;
  uniform float uCoast;
  uniform float uLand;
  uniform float uNightClouds;
  uniform vec3 uSea;
  uniform vec3 uLandNight;
  uniform vec3 uCoastColor;
  uniform vec3 uDim;
  uniform vec3 uBright;
  uniform float uFloor;
  uniform float uGamma;
  uniform float uLightOpacity;
  varying vec3 vPos;
  varying vec3 vWorld;

  vec3 turn(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }

  void main() {
    vec3 n = normalize(vPos);
    // Only the hemisphere facing the camera has pictures: anything beyond is the limb.
    vec2 uv = 0.5 + 0.5 * n.xy / max(1.0, length(n.xy) * 1.0001);
    vec3 V = normalize(cameraPosition - vWorld);
    float mu = dot(n, uSun);

    vec3 albedo = texture2D(uDay, uv).rgb;
    vec4 data = texture2D(uData, uv);
    float land = data.b;
    // The clouds drift eastwards: read them a little upstream.
    vec3 m = turn(n, uAxis, -uCloudTurn);
    float cloud = texture2D(uData, 0.5 + 0.5 * m.xy).g * smoothstep(0.0, 0.12, m.z);

    // Day.
    float lambert = max(mu, 0.0);
    vec3 surface = mix(albedo, vec3(0.92, 0.94, 0.97), cloud * 0.95);
    vec3 H = normalize(uSun + V);
    float glint = pow(max(dot(n, H), 0.0), 90.0) * (1.0 - land) * (1.0 - cloud) * step(0.0, mu);
    vec3 day = surface * (1.18 * lambert) + vec3(1.0, 0.94, 0.82) * glint * 0.55;

    // Night.
    vec3 night = mix(uSea, uLandNight, land * uLand);
    night = mix(night, vec3(0.07, 0.09, 0.16), cloud * uNightClouds * 0.3);
    float b = pow(clamp((data.r - uFloor) / (1.0 - uFloor), 0.0, 1.0), uGamma);
    night += mix(uDim, uBright, b) * b * uLightOpacity * uLights;
    // The coast: where the mask crosses one half, one pixel wide.
    float d = (land - 0.5) / max(fwidth(land), 1e-4);
    float coast = 1.0 - smoothstep(0.5 * uPixelRatio - 0.5, 0.5 * uPixelRatio + 0.6, abs(d));
    night = mix(night, uCoastColor, coast * 0.7 * uCoast);

    float dayAmount = smoothstep(-0.04, 0.14, mu);
    vec3 color = mix(night, day, dayAmount);
    // The twilight: a warm band along the line between day and night.
    float dusk = exp(-pow(mu / 0.05, 2.0));
    color += vec3(1.0, 0.48, 0.22) * dusk * (0.025 + 0.07 * cloud);
    // The air, seen edge-on near the limb: blue, brighter on the side of the Sun.
    float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    color += vec3(0.30, 0.55, 1.0) * rim * (0.08 + 0.9 * smoothstep(-0.3, 0.45, mu));

    gl_FragColor = vec4(color, uFade);
    #include <colorspace_fragment>
  }`;

const AIR_FRAGMENT = /* glsl */ `
  uniform vec3 uCentre;
  uniform float uRadius;
  uniform vec3 uSun;
  uniform float uFade;
  varying vec3 vWorld;
  void main() {
    // Where the line of sight passes closest to the centre: outside the disc, the air glows.
    vec3 rd = normalize(vWorld - cameraPosition);
    vec3 closest = cameraPosition + rd * dot(uCentre - cameraPosition, rd);
    vec3 off = closest - uCentre;
    float b = length(off);
    float h = (b - uRadius) / uRadius;
    // A hair inside the disc too: it covers the edge of the tessellated ball.
    if (h < -0.0015) discard;
    h = max(h, 0.0);
    float glow = exp(-h / 0.009) * 0.85 + exp(-h / 0.02) * 0.03 * (1.0 - smoothstep(0.05, 0.1, h));
    float s = dot(off / b, uSun);
    float lit = 0.1 + 1.15 * smoothstep(-0.35, 0.6, s);
    vec3 color = mix(vec3(0.22, 0.42, 1.0), vec3(0.55, 0.76, 1.0), smoothstep(0.2, 0.9, s));
    gl_FragColor = vec4(color * glow * lit, uFade);
    #include <colorspace_fragment>
  }`;

interface GlobeTextures {
  readonly day: Texture;
  readonly data: DataTexture;
}

function loadGlobe(): Promise<GlobeTextures> {
  return Promise.all([
    loadColorTexture('data/globe-day.webp'),
    packGreyTextures(['data/globe-lights.webp', 'data/globe-clouds.webp', 'data/globe-land.webp']),
  ]).then(([day, data]) => ({ day, data }));
}

/**
 * Adds the globe to the scene of `s` (a level whose origin may be any anchor) and keeps it
 * up to date. The pictures are shared with the other level that draws the Earth.
 */
export async function addGlobe(s: AsyncSketch): Promise<Vec3> {
  const textures = await acquire('globe', loadGlobe, (t) => {
    t.day.dispose();
    t.data.dispose();
  });
  s.onDispose(textures.release);
  const { day, data } = textures.value;

  const at = s.local(ANCHORS.earth);
  const radius = s.units(EARTH_RADIUS);
  const sun = new Vector3(...EARTH_LIGHT);

  const globe = new ShaderMaterial({
    uniforms: {
      uDay: { value: day },
      uData: { value: data },
      uSun: { value: sun },
      uAxis: { value: AXIS },
      uCloudTurn: { value: 0 },
      uFade: { value: 1 },
      uPixelRatio: { value: 1 },
      uLights: { value: 0 },
      uCoast: { value: 0 },
      uLand: { value: 0 },
      uNightClouds: { value: 0 },
      uSea: { value: new Color(SEA_AT_NIGHT) },
      uLandNight: { value: new Color(LAND_AT_NIGHT) },
      uCoastColor: { value: new Color(COAST) },
      uDim: { value: new Color(NIGHT_STYLE.dim) },
      uBright: { value: new Color(NIGHT_STYLE.bright) },
      uFloor: { value: NIGHT_STYLE.floor },
      uGamma: { value: NIGHT_STYLE.gamma },
      uLightOpacity: { value: NIGHT_STYLE.opacity },
    },
    vertexShader: VERTEX,
    fragmentShader: GLOBE_FRAGMENT,
    transparent: true,
    blending: NormalBlending,
    depthTest: true,
    depthWrite: true,
    side: FrontSide,
  });
  const ball = new Mesh(new SphereGeometry(radius, 192, 128), globe);
  ball.position.set(at[0], at[1], at[2]);
  ball.renderOrder = -2;
  s.scene.add(ball);

  const air = new ShaderMaterial({
    uniforms: {
      uCentre: { value: new Vector3(at[0], at[1], at[2]) },
      uRadius: { value: radius },
      uSun: { value: sun },
      uFade: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: AIR_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: FrontSide,
  });
  const shell = new Mesh(new SphereGeometry(radius * 1.12, 128, 64), air);
  shell.position.copy(ball.position);
  shell.renderOrder = -1;
  s.scene.add(shell);

  s.every((frame: LevelFrame) => {
    const look = globeLook(frame.e);
    const u = globe.uniforms;
    u.uFade!.value = frame.fade;
    u.uPixelRatio!.value = frame.pixelRatio;
    u.uCloudTurn!.value = frame.time * CLOUD_DRIFT;
    u.uLights!.value = look.lights;
    // On a small globe (a phone) the coasts would crowd the night: fainter.
    const discPx = radius * frame.pxPerUnit;
    u.uCoast!.value = look.coast * (0.4 + 0.6 * smoothstep(110, 280, discPx));
    u.uLand!.value = look.land;
    u.uNightClouds!.value = look.nightClouds;
    air.uniforms.uFade!.value = frame.fade;
  });
  return at;
}
