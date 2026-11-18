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
import './styles/lab.css';
import { Soundscape } from './audio/ambient.ts';
import { SoundToggle } from './audio/toggle.ts';
import { bubbleAt, bubbleStop, exactRadiusLine } from './bubble.ts';
import { FINALE_IS_PLACEHOLDER } from './content/finale.ts';
import { LABELS } from './content/labels.ts';
import { UI } from './content/ui.ts';
import { Clock } from './engine/clock.ts';
import { Engine } from './engine/engine.ts';
import { Input } from './engine/input.ts';
import { FINALE, FIRST_STOP, INTRO, NODES, U_MAX, neighbour } from './engine/journey.ts';
import { StarBackdrop } from './levels/backdrop.ts';
import { LEVELS } from './levels/registry.ts';
import { civilDateOf, firstLineKey, parseHash } from './personalization.ts';
import { parseRoute } from './route.ts';
import type { ResolveStop } from './ui/counter-model.ts';
import { DebugOverlay } from './ui/debug.ts';
import { el } from './ui/dom.ts';
import { Epilogue } from './ui/epilogue.ts';
import { Finale } from './ui/finale.ts';
import { finaleTimeline } from './finale-script.ts';
import { GOLDEN_RECORD_LAB_READY, LAB_PART, buildGoldenRecord } from './ui/golden-record.ts';
import { Interface } from './ui/interface.ts';
import { Intro } from './ui/intro.ts';
import { LabelLayer } from './ui/labels.ts';
import { FreeArea } from './ui/layout.ts';
import { LensLayer } from './ui/lens.ts';
import { Marker } from './ui/marker.ts';
import { Overlays } from './ui/overlay.ts';
import { buildPaleBlueDot } from './ui/pale-blue-dot.ts';
import { typeset } from './ui/rich-text.ts';
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
    // The finale is never skipped: on the way to it ▶ goes no further, and on it ▶ brings
    // the next line of the message until everything has been said.
    if (dir === 1 && !finaleTimeline.complete) {
      if (engine.motion.heading === FINALE) return;
      if (engine.motion.atNode === FINALE) {
        finale.advance();
        return;
      }
    }
    if (!reducedMotion) {
      engine.go(dir);
      return;
    }
    // The stop is chosen when the jump starts: a press kept while the veil lifts goes one further.
    void veil.through(() => {
      const node = neighbour(engine.motion.u, dir);
      return node ? engine.jumpTo(node.u) : undefined;
    });
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
  // The placement of a lens keeps room for its real text, as the interface measures it.
  engine.measureLensCaptions((label) => lenses.measure(label));
  const markerLayer = document.createElement('div');
  markerLayer.className = 'marker-layer';
  const marker = new Marker(LABELS.youAreHere);
  markerLayer.append(marker.element);

  // «Da quando sei su questa pagina»: with ?static=1 time stands still, so the page pretends
  // to have been open for one minute and the screenshots show a real number.
  const openedAt = new Date(clock.now().getTime() - (route.isStatic ? 60_000 : 0));

  // The stop of the bubble reads as it is true today: the same model moves its scene.
  const bubble = () => bubbleAt(person.birth, clock.now());
  const resolve: ResolveStop = (stop) => (stop.special === 'bubble' ? bubbleStop(stop, bubble()) : stop);

  const ui = new Interface({
    go,
    animated: !route.isStatic,
    reducedMotion,
    resolve,
    extras: {
      // The Voyager stop: the live distance and the button that opens the Golden Record.
      voyager: () => buildVoyagerPanel({ now: () => clock.now(), openedAt, openGoldenRecord: () => overlays.show('disco') }),
      // The bubble: with her date of birth, how far her light has got today.
      bubble: () => {
        const line = exactRadiusLine(bubble());
        return line ? el('p', 'bubble-today', typeset(line)) : null;
      },
    },
    moreExtras: {
      // The far planets: the real photo «Pale Blue Dot», at the end of «saperne di più».
      'pianeti-lontani': () => buildPaleBlueDot(),
    },
  });
  // «Il cielo che respira»: off until she turns it on (audio/ambient.ts, audio/toggle.ts).
  const soundscape = new Soundscape({ bubbleSeconds: () => bubble().radius, finaleWave: finaleTimeline.script.cues.wave });
  const sound = new SoundToggle({ enabled: !route.isStatic, onChange: (on) => soundscape.setEnabled(on, engine.motion.u) });
  const intro = new Intro({
    name: person.name,
    firstLine: firstLineKey(person.birth, civilDateOf(clock.now())),
    animated: !route.isStatic,
    onStart: start,
    extra: sound.big,
  });
  // With time frozen the finale shows everything said; `?finale=<seconds>` freezes it at
  // that moment of its sequence instead (for the screenshots of what happens on the way).
  if (route.isStatic) {
    const at = Number(params.get('finale'));
    finaleTimeline.freeze(params.has('finale') && Number.isFinite(at) ? at : undefined);
  }
  const finale = new Finale({ name: person.name, timeline: finaleTimeline, go });
  // A push forward against the finale (a swipe, the wheel) is a wish for the next line.
  engine.motion.onCeiling = () => {
    if (engine.motion.atNode === FINALE || Math.abs(engine.motion.u - FINALE.u) < 0.05) finale.advance();
  };
  const epilogue = new Epilogue({
    replay,
    openSources: () => overlays.show('fonti'),
    // «Crea il tuo Disco d'oro» opens the page at the lab; the story is above it.
    openGoldenRecord: () => overlays.show('disco', GOLDEN_RECORD_LAB_READY ? LAB_PART : undefined),
    go,
  });
  const underneath = [stage, ui.element, intro.element, finale.element, epilogue.element];
  const overlays = new Overlays(
    {
      fonti: (id, close) => buildSources(id, close, resolve),
      disco: (id, close) =>
        buildGoldenRecord(id, close, {
          animated: !route.isStatic,
          reducedMotion,
          now: () => clock.now(),
          name: person.name,
          birth: person.birth,
        }),
    },
    () => underneath,
  );
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
    sound.small,
    curtain.element,
    overlays.element,
  );
  if (debug) app.append(debug.element);

  // The free area of the scene is the empty cell of whoever owns the screen.
  const free = new FreeArea(engine, stage);
  const cells: Record<ScreenOwner, HTMLElement> = { intro: intro.star, journey: ui.scene, finale: finale.star, epilogue: epilogue.star };
  let owner = screenOwner(route.u);
  free.follow(cells[owner], true);
  // In the opening the big switch is there; along the journey the small one.
  sound.showSmall(owner !== 'intro');

  const lastStop = [...NODES].reverse().find((node) => node.stop) ?? FINALE;

  engine.onFrame((info) => {
    const next = screenOwner(info.u);
    if (next !== owner) {
      owner = next;
      free.follow(cells[owner]);
      sound.showSmall(owner !== 'intro');
    }
    ui.update(info);
    free.freeze(ui.panel.reading);
    intro.setOpacity(introOpacity(info.u));
    finale.setOpacity(finaleOpacity(info.u));
    epilogue.setOpacity(epilogueOpacity(info.u));
    if (info.atNode === FINALE) finale.arrive();
    else if (info.u <= lastStop.u + 0.1) finale.leave();
    finale.update(info.dt);
    soundscape.update({ u: info.u, atNode: info.atNode?.id ?? null, finaleTime: finaleTimeline.t, covered: overlays.current !== null });
    // Until the message has been said, free movement stops at the finale.
    engine.motion.ceiling = finaleTimeline.complete || info.u > FINALE.u + 0.05 ? U_MAX : FINALE.u;
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
  // A tap anywhere on the scene of the finale brings the next line, like a tap on the words.
  stage.addEventListener('click', () => {
    if (!overlays.current && engine.motion.atNode === FINALE) finale.advance();
  });

  // `?stop=disco&disco=laboratorio` opens the Golden Record at the lab (see CLAUDE.md, «Contratto URL»).
  if (route.overlay) overlays.show(route.overlay, route.overlay === 'disco' ? (params.get('disco') ?? undefined) : undefined);

  void loadFonts()
    .then(() => engine.start())
    .then(() => {
      if (engine.motion.beforeStart) intro.begin();
    });
}

boot();
