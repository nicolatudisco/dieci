/**
 * Start-up: reads the URL contract, builds the stage and the interface, starts the engine.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import { LABELS } from './content/labels.ts';
import { UI } from './content/ui.ts';
import { Clock } from './engine/clock.ts';
import { Engine } from './engine/engine.ts';
import { Input } from './engine/input.ts';
import { neighbour } from './engine/journey.ts';
import { StarBackdrop } from './levels/backdrop.ts';
import { LEVELS } from './levels/registry.ts';
import { parseRoute } from './route.ts';
import { DebugOverlay } from './ui/debug.ts';
import { Interface } from './ui/interface.ts';
import { LabelLayer } from './ui/labels.ts';
import { FreeArea } from './ui/layout.ts';
import { LensLayer } from './ui/lens.ts';
import { Marker } from './ui/marker.ts';
import { ScaleFrames } from './ui/scale-frames.ts';
import { Veil } from './ui/veil.ts';

function fail(app: HTMLElement, message: string): void {
  const box = document.createElement('p');
  box.className = 'fatal';
  box.textContent = message;
  app.replaceChildren(box);
}

/** The typefaces must be there before the first frame is declared ready. */
async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const faces = ['340 1em "Fraunces Variable"', 'italic 400 1em "Fraunces Variable"', '400 1em "Andika"', '700 1em "Andika"'];
  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => [])));
}

function boot(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app not found');

  const params = new URLSearchParams(location.search);
  const route = parseRoute(location.search);
  const clock = new Clock(route.isStatic);
  if (route.isStatic) document.documentElement.dataset.static = '1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = document.createElement('div');
  stage.className = 'stage';
  app.append(stage);

  let engine: Engine;
  try {
    engine = new Engine({
      container: stage,
      defs: LEVELS,
      clock,
      u: route.u,
      backdrop: new StarBackdrop(),
      forceOffscreen: params.get('offscreen') === '1',
    });
  } catch (error) {
    console.error(error);
    fail(app, UI.errors.noWebGL);
    return;
  }

  // Layers over the canvas, back to front.
  const frames = new ScaleFrames();
  const labels = new LabelLayer();
  const markerLayer = document.createElement('div');
  markerLayer.className = 'marker-layer';
  const marker = new Marker(LABELS.youAreHere);
  const lenses = new LensLayer();
  markerLayer.append(marker.element);
  const veil = new Veil();

  // ▶ and ◀: an animated zoom, or a fade through night when movement is not wanted.
  const go = (dir: 1 | -1): void => {
    if (!reducedMotion) {
      engine.go(dir);
      return;
    }
    const node = neighbour(engine.motion.u, dir);
    if (node) void veil.through(() => engine.jumpTo(node.u));
  };

  const ui = new Interface({ go, animated: !route.isStatic, reducedMotion });
  const debug = route.debug ? new DebugOverlay() : null;
  app.append(frames.element, labels.element, lenses.element, markerLayer, veil.element, ui.element);
  if (debug) app.append(debug.element);

  const free = new FreeArea(engine, stage);
  free.follow(ui.scene, true);

  engine.onFrame((info) => {
    ui.update(info);
    free.freeze(ui.panel.reading);
    frames.update(info.framing);
    labels.update(info.labels);
    lenses.update(info.lenses);
    marker.update(info.framing, info.u, info.markerLabelClear);
    debug?.update(info);
  });

  new Input({ surface: stage, motion: engine.motion, go, enabled: () => true });

  void loadFonts()
    .then(() => engine.start())
    .then(() => {
      // Provisional: there is no opening yet, so the journey starts by itself.
      if (!route.isStatic && engine.motion.u < 0) window.setTimeout(() => go(1), 600);
    });
}

boot();
