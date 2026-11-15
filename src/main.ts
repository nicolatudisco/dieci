/**
 * Start-up: reads the URL contract, builds the stage and the interface, starts the engine.
 *
 * M1 step 2: the interface is still provisional (ui/provisional.ts) and the opening is
 * skipped automatically; steps 3-6 replace both.
 */
import './styles/base.css';
import { UI } from './content/ui.ts';
import { Clock } from './engine/clock.ts';
import { Engine } from './engine/engine.ts';
import type { Rect } from './engine/framing.ts';
import { Input } from './engine/input.ts';
import { LEVELS } from './levels/registry.ts';
import { parseRoute } from './route.ts';
import { DebugOverlay } from './ui/debug.ts';
import { LabelLayer } from './ui/labels.ts';
import { Marker } from './ui/marker.ts';
import { ProvisionalHud } from './ui/provisional.ts';
import { ScaleFrames } from './ui/scale-frames.ts';

function fail(app: HTMLElement, message: string): void {
  const box = document.createElement('p');
  box.className = 'fatal';
  box.textContent = message;
  app.replaceChildren(box);
}

function boot(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app not found');

  const params = new URLSearchParams(location.search);
  const route = parseRoute(location.search);
  const clock = new Clock(route.isStatic);
  if (route.isStatic) document.documentElement.dataset.static = '1';

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
  const marker = new Marker('Tu sei qui');
  markerLayer.append(marker.element);
  const hud = new ProvisionalHud((dir) => engine.go(dir));
  const debug = route.debug ? new DebugOverlay() : null;
  app.append(frames.element, labels.element, markerLayer, hud.element);
  if (debug) app.append(debug.element);

  // Free area: the stage minus the counter at the top and the buttons at the bottom.
  const measure = (): Rect => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const top = hud.counter.getBoundingClientRect().bottom + 8;
    const bottom = height - hud.controls.getBoundingClientRect().top + 8;
    return { x: 0, y: top, width, height: Math.max(80, height - top - bottom) };
  };
  engine.setFreeRect(measure(), true);
  new ResizeObserver(() => engine.setFreeRect(measure(), true)).observe(stage);

  engine.onFrame((info) => {
    frames.update(info.framing);
    labels.update(info.labels);
    marker.update(info.framing, false);
    hud.update(info);
    debug?.update(info);
  });

  new Input({ surface: stage, motion: engine.motion, go: (dir) => engine.go(dir), enabled: () => true });

  void engine.start().then(() => {
    // Provisional: there is no opening yet, so the journey starts by itself.
    if (!route.isStatic && engine.motion.u < 0) window.setTimeout(() => engine.go(1), 600);
  });
}

boot();
