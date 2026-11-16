/**
 * Start-up: reads the URL contract and the link fragment, builds the stage, the interface
 * and the views, and ties them to the engine.
 *
 * Who is on screen is decided by the position on the journey axis alone (ui/view-model.ts):
 * the opening before the start, the interface along the stops, then finale and epilogue.
 * The two pages «fonti» and «disco» open on top and give the journey back where it was.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/views.css';
import { FINALE_IS_PLACEHOLDER } from './content/finale.ts';
import { LABELS } from './content/labels.ts';
import { UI } from './content/ui.ts';
import { Clock } from './engine/clock.ts';
import { Engine } from './engine/engine.ts';
import { Input } from './engine/input.ts';
import { FINALE, FIRST_STOP, INTRO, NODES, neighbour } from './engine/journey.ts';
import { StarBackdrop } from './levels/backdrop.ts';
import { LEVELS } from './levels/registry.ts';
import { civilDateOf, firstLineKey, parseHash } from './personalization.ts';
import { parseRoute } from './route.ts';
import { DebugOverlay } from './ui/debug.ts';
import { Epilogue } from './ui/epilogue.ts';
import { Finale } from './ui/finale.ts';
import { GOLDEN_RECORD_LAB_READY, buildGoldenRecord } from './ui/golden-record.ts';
import { Interface } from './ui/interface.ts';
import { Intro } from './ui/intro.ts';
import { LabelLayer } from './ui/labels.ts';
import { FreeArea } from './ui/layout.ts';
import { LensLayer } from './ui/lens.ts';
import { Marker } from './ui/marker.ts';
import { Overlays } from './ui/overlay.ts';
import { ScaleFrames } from './ui/scale-frames.ts';
import { buildSources } from './ui/sources.ts';
import { Veil } from './ui/veil.ts';
import { buildVoyagerPanel } from './ui/voyager-panel.ts';
import { epilogueOpacity, finaleOpacity, introOpacity, screenOwner, type ScreenOwner } from './ui/view-model.ts';

/** Seconds of the first zoom, from the single star to the street: slower than the others. */
const FIRST_ZOOM_SECONDS = 3.4;

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
  // Name and date of birth live only in the link fragment and in memory: never stored.
  const person = parseHash(location.hash);
  if (FINALE_IS_PLACEHOLDER) console.warn('Dieci: il messaggio del finale non è ancora stato scritto (src/content/finale.ts).');

  // The one heading of the page, for whoever does not see it.
  const heading = document.createElement('h1');
  heading.className = 'sr-only';
  heading.textContent = document.title;
  const stage = document.createElement('div');
  stage.className = 'stage';
  app.append(heading, stage);

  let engine: Engine;
  try {
    engine = new Engine({
      container: stage,
      defs: LEVELS,
      clock,
      u: route.u,
      backdrop: new StarBackdrop(),
      birth: person.birth,
      name: person.name,
      forceOffscreen: params.get('offscreen') === '1',
    });
  } catch (error) {
    console.error(error);
    fail(app, UI.errors.noWebGL);
    return;
  }

  // Two curtains of night: one over the scene only, one over everything but the pages on top.
  const veil = new Veil();
  const curtain = new Veil();

  /** «Inizia il viaggio»: from the single star to the street. */
  const start = (): void => {
    if (!engine.motion.beforeStart) return;
    if (reducedMotion) void curtain.through(() => engine.jumpTo(FIRST_STOP.u));
    else engine.motion.travelTo(FIRST_STOP, FIRST_ZOOM_SECONDS);
  };

  /** ▶ and ◀: an animated zoom, or a fade through night when movement is not wanted. */
  const go = (dir: 1 | -1): void => {
    if (overlays.current) return;
    if (engine.motion.beforeStart) {
      if (dir === 1) start();
      return;
    }
    if (!reducedMotion) {
      engine.go(dir);
      return;
    }
    const node = neighbour(engine.motion.u, dir);
    if (node) void veil.through(() => engine.jumpTo(node.u));
  };

  /** «Rifai il viaggio»: back to the single star. */
  const replay = (): void => {
    void curtain.through(async () => {
      await engine.jumpTo(INTRO.u);
      finale.leave();
      intro.begin();
    });
  };

  // Layers over the canvas, back to front.
  const frames = new ScaleFrames();
  const labels = new LabelLayer();
  const lenses = new LensLayer();
  const markerLayer = document.createElement('div');
  markerLayer.className = 'marker-layer';
  const marker = new Marker(LABELS.youAreHere);
  markerLayer.append(marker.element);

  // «Da quando sei su questa pagina»: with ?static=1 time stands still, so the page pretends
  // to have been open for one minute and the screenshots show a real number.
  const openedAt = new Date(clock.now().getTime() - (route.isStatic ? 60_000 : 0));

  const ui = new Interface({
    go,
    animated: !route.isStatic,
    reducedMotion,
    extras: {
      // The Voyager stop: the live distance and the button that opens the Golden Record.
      voyager: () => buildVoyagerPanel({ now: () => clock.now(), openedAt, openGoldenRecord: () => overlays.show('disco') }),
    },
  });
  const intro = new Intro({
    name: person.name,
    firstLine: firstLineKey(person.birth, civilDateOf(clock.now())),
    animated: !route.isStatic,
    onStart: start,
  });
  const finale = new Finale({ name: person.name, animated: !route.isStatic, go });
  const epilogue = new Epilogue({
    replay,
    openSources: () => overlays.show('fonti'),
    openGoldenRecord: GOLDEN_RECORD_LAB_READY ? () => overlays.show('disco') : null,
    go,
  });
  const underneath = [stage, ui.element, intro.element, finale.element, epilogue.element];
  const overlays = new Overlays({ fonti: buildSources, disco: buildGoldenRecord }, () => underneath);
  const debug = route.debug ? new DebugOverlay() : null;

  app.append(
    frames.element,
    labels.element,
    lenses.element,
    markerLayer,
    veil.element,
    ui.element,
    intro.element,
    finale.element,
    epilogue.element,
    curtain.element,
    overlays.element,
  );
  if (debug) app.append(debug.element);

  // The free area of the scene is the empty cell of whoever owns the screen.
  const free = new FreeArea(engine, stage);
  const cells: Record<ScreenOwner, HTMLElement> = { intro: intro.star, journey: ui.scene, finale: finale.star, epilogue: epilogue.star };
  let owner = screenOwner(route.u);
  free.follow(cells[owner], true);

  const lastStop = [...NODES].reverse().find((node) => node.stop) ?? FINALE;

  engine.onFrame((info) => {
    const next = screenOwner(info.u);
    if (next !== owner) {
      owner = next;
      free.follow(cells[owner]);
    }
    ui.update(info);
    free.freeze(ui.panel.reading);
    intro.setOpacity(introOpacity(info.u));
    finale.setOpacity(finaleOpacity(info.u));
    epilogue.setOpacity(epilogueOpacity(info.u));
    if (info.atNode === FINALE) finale.arrive();
    else if (info.u <= lastStop.u + 0.1) finale.leave();
    // Where the journey stands, for tests and debugging: the id of the node, or nothing while moving.
    const at = info.atNode?.id ?? '';
    if (document.documentElement.dataset.at !== at) document.documentElement.dataset.at = at;

    frames.update(info.framing);
    labels.update(info.labels);
    lenses.update(info.lenses);
    marker.update(info.framing, info.u, info.markerLabelClear);
    debug?.update(info);
  });

  new Input({ surface: stage, motion: engine.motion, go, enabled: () => overlays.current === null });

  if (route.overlay) overlays.show(route.overlay);

  void loadFonts()
    .then(() => engine.start())
    .then(() => {
      if (engine.motion.beforeStart) intro.begin();
    });
}

boot();
