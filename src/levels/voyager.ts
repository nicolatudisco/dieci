/**
 * The Voyager stop: the Sun reduced to a star, the whole planetary system inside one small
 * circle, and far away the probe, tied to home by a dashed trail.
 *
 * - The probe is where the table of JPL Horizons puts it today (src/voyager.ts): the same
 *   number that runs in the live panel of the page, so picture and text cannot disagree.
 * - In scale it is far less than a pixel: the lens shows it, drawn in three dimensions
 *   (voyager-model.ts). Its dish looks back at the Sun, as the real one always does.
 */
import { AmbientLight, DirectionalLight, HemisphereLight, Matrix4, Quaternion, Scene, Vector3 } from 'three';
import { LABELS } from '../content/labels.ts';
import { ANCHORS, AU, type Vec3 } from '../engine/stage.ts';
import { formatNumber } from '../ui/format.ts';
import { voyagerDistanceKm } from '../voyager.ts';
import { drawSun } from './placeholder/bodies.ts';
import { sketch } from './placeholder/sketch.ts';
import { planet } from './solar-system.ts';
import { buildVoyager } from './voyager-model.ts';

/** Where Voyager 1 is on the stage, in metres, when it is `km` from the Earth. */
function probeOnStage(km: number): Vec3 {
  // The anchor fixes the direction (a composition choice) and the distance of 18 Nov 2026.
  const [ex, ey, ez] = ANCHORS.earth;
  const [vx, vy] = ANCHORS.voyager1;
  const length = Math.hypot(vx - ex, vy - ey);
  const metres = km * 1000;
  return [ex + ((vx - ex) / length) * metres, ey + ((vy - ey) / length) * metres, ez];
}

/**
 * How much the dish is turned towards whoever looks, away from the plane of the picture:
 * little, so that the probe is seen from its side, with the body and the Golden Record in
 * full view behind the dish.
 */
const DISH_TILT = (22 * Math.PI) / 180;

export default sketch((s) => {
  const sun = drawSun(s);
  // The orbit of Neptune, for comparison: every planet is inside this small circle.
  const neptune = s.units(planet('neptune').au * AU);
  s.ring(sun, neptune, { opacity: 0.42 });
  s.label({ id: 'neptune', text: LABELS.places.neptuneOrbit, at: [sun[0], sun[1] - neptune, sun[2]], kind: 'note', align: 'below' });

  const distance = (): string => LABELS.liveKilometres.replace('{km}', formatNumber(Math.floor(voyagerDistanceKm(s.ctx.now()))));
  const probe = s.local(probeOnStage(voyagerDistanceKm(s.ctx.now())));
  // The trail: a soft glow under a dashed line, from home to the probe.
  s.line(sun, probe, { opacity: 0.16, width: 5 });
  s.line(sun, probe, { dash: [6, 7], opacity: 0.62, width: 1.4 });
  s.dot(probe, 7, [0.95, 0.96, 1]);
  // How long the trail is, at this very moment: the same number that runs in the page.
  const along = (share: number): Vec3 => [sun[0] + (probe[0] - sun[0]) * share, sun[1] + (probe[1] - sun[1]) * share, sun[2]];
  const trail = Math.hypot(probe[0] - sun[0], probe[1] - sun[1]);
  // It leaves early: as the trail shrinks it would end up on the words «Tu sei qui».
  const live = { id: 'distance', text: distance(), at: along(0.56), kind: 'figure' as const, align: 'above' as const, to: 13.85 };
  s.label(live);

  // The lens: the probe in three dimensions, lit by a Sun that is now only a bright star.
  const scene = new Scene();
  const home = new Vector3(sun[0] - probe[0], sun[1] - probe[1], 0).normalize();
  const sunlight = new DirectionalLight('#fff3df', 3.4);
  sunlight.position.set(home.x, home.y, 0.75);
  scene.add(sunlight, new HemisphereLight('#9fb0f2', '#131a3a', 1.1), new AmbientLight('#8fa3e6', 0.25));

  const model = buildVoyager();
  // Dish towards home and a little towards us; the two booms across the picture; the face
  // of the body that carries the Golden Record (+z of the model) towards us.
  const boresight = new Vector3(home.x * Math.cos(DISH_TILT), home.y * Math.cos(DISH_TILT), Math.sin(DISH_TILT));
  const across = new Vector3(home.y, -home.x, 0);
  across.addScaledVector(boresight, -across.dot(boresight)).normalize();
  const rest = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, boresight, new Vector3().crossVectors(across, boresight)));
  model.root.quaternion.copy(rest);
  scene.add(model.root);

  // Below the trail, so that its words never sit on the probe or on the running number.
  s.lens({ id: 'voyager', at: probe, scene, fieldWidth: 8.8, centre: [0.3, 0.2], angle: -100, label: LABELS.places.voyager1 });

  // The point of view sways a little, so that the probe is felt as a solid thing; the
  // Golden Record catches the light now and then. Both stand still at time zero.
  const sway = new Quaternion();
  const axis = new Vector3();
  s.tick = (frame) => {
    live.text = distance();
    // On a small screen the lens and its words take the far end of the trail.
    live.at = along(trail * frame.pxPerUnit < 240 ? 0.2 : 0.56);
    const t = frame.time;
    sway.setFromAxisAngle(axis.set(0.35, 1, 0).normalize(), 0.2 * Math.sin(t * 0.28));
    model.root.quaternion.copy(sway).multiply(rest);
    model.record.emissiveIntensity = 1 + 1.6 * Math.max(0, Math.sin(t * 0.9)) ** 6;
  };
});
