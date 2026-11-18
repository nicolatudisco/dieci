/**
 * «Crea il tuo Disco d'oro»: the lab under the story of the Golden Record. One page, with
 * her disc next to the choices and changing as she makes them: the picture appears on the
 * label, the message is engraved around the edge as she types (the disc stops still with
 * the words upright while she writes). The three steps are big tiles made for a finger,
 * real radio buttons inside a fieldset, so keyboards and screen readers work by themselves.
 *
 * «Crea il mio disco» is the ceremony: a needle of light cuts the grooves from the edge
 * inwards while her sound plays (she pressed the button: nothing plays by itself), then the
 * words of the engraving are written on the label. Then «Ascolta» lets the needle read the
 * grooves again, and «Salva il disco» downloads the PNG. Nothing is ever blocked: what she
 * has not chosen is simply not there.
 *
 * Nothing is stored: her disc lives as long as the page is open.
 */
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { UI } from '../content/ui.ts';
import type { CivilDate } from '../personalization.ts';
import { button, el, icon } from '../ui/dom.ts';
import { RecordDisc, clockFromNow, type Clock, type DiscMotion } from '../ui/record-disc.ts';
import { setRich, typeset } from '../ui/rich-text.ts';
import {
  EMPTY_DESIGN,
  clampMessage,
  countCharacters,
  counterText,
  engravingFor,
  type DiscDesign,
  type PictureId,
  type SoundId,
} from './design.ts';
import { discPng, download } from './export.ts';
import { fontsReady } from './paint.ts';
import { pictureSvg } from './pictures.ts';
import { SCORES, envelope } from './scores.ts';
import { playSound, type Playing } from './synth.ts';

export interface LabOptions {
  readonly motion: DiscMotion;
  /** Today, from the clock of the site (fixed with ?static=1). */
  readonly now: () => Date;
  /** From the link fragment only: never stored. */
  readonly name: string | null;
  readonly birth: CivilDate | null;
}

/** Seconds the needle takes to cut plain grooves, when she has chosen no sound. */
const SILENT_CUT = 3;
/** Seconds the words take to be written on the label. */
const WRITING = 2.4;

const SVG = 'http://www.w3.org/2000/svg';

/** The shape of a sound as a small drawing: loud is tall, mirrored around the middle. */
function waveSvg(id: SoundId): SVGSVGElement {
  const values = envelope(id, 48);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${values.length} 20`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('tile__wave-shape');
  const half = (value: number): number => 0.6 + 9.2 * value;
  const top = values.map((v, i) => `${i ? 'L' : 'M'}${i + 0.5} ${(10 - half(v)).toFixed(2)}`).join('');
  const bottom = values
    .map((v, i) => [i, v] as const)
    .reverse()
    .map(([i, v]) => `L${i + 0.5} ${(10 + half(v)).toFixed(2)}`)
    .join('');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', `${top}${bottom}Z`);
  svg.append(path);
  return svg;
}

interface Tile<T extends string> {
  readonly id: T;
  readonly element: HTMLLabelElement;
  readonly input: HTMLInputElement;
}

function tile<T extends string>(group: string, id: T, label: string, art: Element, extra = ''): Tile<T> {
  const element = el('label', `tile ${extra}`.trim());
  const input = el('input', 'tile__input');
  input.type = 'radio';
  input.name = group;
  input.value = id;
  const artBox = el('span', 'tile__art');
  artBox.append(art);
  const name = el('span', 'tile__label');
  setRich(name, typeset(label));
  element.append(input, artBox, name);
  return { id, element, input };
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class Lab {
  readonly element = el('section', 'sheet lab');
  readonly heading = el('h2', 'lab__title');
  readonly disc: RecordDisc;
  private readonly options: LabOptions;
  private design: DiscDesign = EMPTY_DESIGN;
  private readonly pictureTiles: Tile<PictureId>[];
  private readonly soundTiles: Tile<SoundId>[];
  private readonly message = el('textarea', 'lab__message');
  private readonly counter = el('p', 'lab__counter');
  private readonly create = button('cta lab__create');
  private readonly actions = el('div', 'lab__actions');
  private readonly listen = button('choice lab__listen');
  private readonly save = button('cta lab__save');
  private playing: Playing | null = null;
  private listening = false;
  private composing = false;
  private open = false;
  /** Counts the ceremonies, so that one cut short by closing the page stops where it is. */
  private ceremony = 0;

  constructor(options: LabOptions, back: HTMLElement) {
    this.options = options;
    this.disc = new RecordDisc({ spinning: options.motion === 'full', art: 'hers', motion: options.motion });
    this.disc.element.classList.add('lab__disc');

    this.heading.id = 'lab-title';
    setRich(this.heading, typeset(UI.end.goldenRecord));
    this.element.setAttribute('aria-labelledby', this.heading.id);
    const intro = el('p', 'lab__intro');
    setRich(intro, typeset(GOLDEN_RECORD.yourTurn));

    // The disc, with what can be done with it once it is made.
    this.listen.append(icon('forward'), el('span', undefined, GOLDEN_RECORD.actions.listen));
    this.listen.setAttribute('aria-pressed', 'false');
    this.listen.addEventListener('click', () => this.toggleListening());
    this.save.append(el('span', undefined, GOLDEN_RECORD.actions.save));
    this.save.addEventListener('click', () => void this.saveDisc());
    this.actions.append(this.listen, this.save);
    this.actions.hidden = true;
    const holder = el('div', 'lab__holder');
    holder.append(this.disc.element, this.actions);
    const discColumn = el('div', 'lab__disc-column');
    discColumn.append(holder);

    // 1. The picture.
    this.pictureTiles = GOLDEN_RECORD.images.map((image) => tile('lab-picture', image.id, image.label, pictureSvg(image.id)));
    for (const t of this.pictureTiles) t.input.addEventListener('change', () => this.update({ ...this.design, picture: t.id }));
    const pictures = this.step(GOLDEN_RECORD.steps.image, this.pictureTiles, 'lab__tiles--pictures');

    // 2. The sound: choosing it plays it; touching it again stops it.
    this.soundTiles = GOLDEN_RECORD.sounds.map((sound) => {
      const wave = el('span', 'tile__wave');
      wave.append(waveSvg(sound.id), el('span', 'tile__head'));
      wave.style.setProperty('--duration', `${SCORES[sound.id].duration}s`);
      return tile('lab-sound', sound.id, sound.label, wave, 'tile--sound');
    });
    for (const t of this.soundTiles) t.input.addEventListener('click', () => this.chooseSound(t.id));
    const sounds = this.step(GOLDEN_RECORD.steps.sound, this.soundTiles, 'lab__tiles--sounds');

    // 3. The message.
    const writing = el('fieldset', 'lab__step');
    const legend = el('legend', 'lab__legend');
    legend.id = 'lab-message-legend';
    setRich(legend, typeset(GOLDEN_RECORD.steps.message));
    this.message.rows = 3;
    this.message.placeholder = GOLDEN_RECORD.message.placeholder;
    this.message.setAttribute('aria-labelledby', legend.id);
    this.message.setAttribute('autocomplete', 'off');
    this.message.setAttribute('enterkeyhint', 'done');
    this.counter.id = 'lab-message-counter';
    this.message.setAttribute('aria-describedby', this.counter.id);
    this.counter.textContent = counterText(0);
    this.message.addEventListener('compositionstart', () => (this.composing = true));
    this.message.addEventListener('compositionend', () => {
      this.composing = false;
      this.typed();
    });
    this.message.addEventListener('input', () => this.typed());
    // While she writes, the disc stops with her words upright.
    this.message.addEventListener('focus', () => this.disc.hold(true));
    this.message.addEventListener('blur', () => this.disc.hold(false));
    writing.append(legend, this.message, this.counter);

    this.create.textContent = GOLDEN_RECORD.actions.create;
    this.create.addEventListener('click', () => void this.makeDisc());

    const steps = el('div', 'lab__steps');
    steps.append(pictures, sounds, writing, this.create);
    const bench = el('div', 'lab__bench');
    bench.append(discColumn, steps);
    this.element.append(this.heading, intro, bench, back);

    // Stop the sound when the device hides the page.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.silence();
    });
  }

  private step<T extends string>(title: string, tiles: readonly Tile<T>[], kind: string): HTMLFieldSetElement {
    const fieldset = el('fieldset', 'lab__step');
    const legend = el('legend', 'lab__legend');
    setRich(legend, typeset(title));
    const grid = el('div', `lab__tiles ${kind}`);
    for (const t of tiles) grid.append(t.element);
    fieldset.append(legend, grid);
    return fieldset;
  }

  /** The page is open. */
  shown(): void {
    this.open = true;
    this.disc.start();
    // The letters on the disc are in Fraunces: once it is there, paint them again with it.
    void fontsReady().then(() => this.disc.repaint());
  }

  /** The page is closed: silence, and anything halfway ends where it was going. */
  hidden(): void {
    this.open = false;
    this.ceremony++;
    this.silence();
    this.disc.settle();
    this.disc.stop();
  }

  /**
   * A disc already made, for the screenshots (`?disco=fatto`): the Earth, the heartbeat and
   * the words of the placeholder as her message.
   */
  demo(): void {
    const message = GOLDEN_RECORD.message.placeholder;
    this.message.value = message;
    this.counter.textContent = counterText(countCharacters(message));
    this.update({ picture: 'terra', sound: 'cuore', message, made: true, engraving: this.engraving() });
    this.finishMaking();
  }

  private engraving(): string {
    return engravingFor(this.options.now(), this.options.birth, this.options.name);
  }

  private update(design: DiscDesign): void {
    this.design = design;
    this.disc.setDesign(design);
    this.mark();
  }

  /** The chosen tiles show it, and their radio buttons too. */
  private mark(): void {
    for (const t of this.pictureTiles) {
      t.element.classList.toggle('is-chosen', t.id === this.design.picture);
      t.input.checked = t.id === this.design.picture;
    }
    for (const t of this.soundTiles) {
      t.element.classList.toggle('is-chosen', t.id === this.design.sound);
      t.input.checked = t.id === this.design.sound;
    }
    this.listen.hidden = this.design.sound === null;
  }

  private chooseSound(id: SoundId): void {
    // Touching the sound that is playing stops it.
    if (this.playing?.id === id) {
      this.silence();
      return;
    }
    const next = { ...this.design, sound: id };
    const playing = this.play(id);
    if (next.made && playing) {
      // Once the disc is made, a new sound is cut into it as it plays.
      this.design = next;
      this.mark();
      void this.disc.cut(next, () => playing.elapsed(), playing.duration);
    } else this.update(next);
  }

  /** Plays a sound (from a tap), with the line running along the shape on its tile. */
  private play(id: SoundId): Playing | null {
    this.silence();
    const playing = playSound(id);
    if (!playing) return null;
    this.playing = playing;
    const tileOf = this.soundTiles.find((t) => t.id === id);
    tileOf?.element.classList.remove('is-playing');
    // A reflow, so that the line starts again from the left.
    void tileOf?.element.offsetWidth;
    tileOf?.element.classList.add('is-playing');
    void playing.ended.then(() => {
      tileOf?.element.classList.remove('is-playing');
      if (this.playing === playing) {
        this.playing = null;
        this.setListening(false);
      }
    });
    return playing;
  }

  private silence(): void {
    const playing = this.playing;
    this.playing = null;
    playing?.stop();
    for (const t of this.soundTiles) t.element.classList.remove('is-playing');
    this.setListening(false);
  }

  private typed(): void {
    if (this.composing) return;
    const text = clampMessage(this.message.value);
    if (text !== this.message.value) {
      const at = this.message.selectionStart;
      this.message.value = text;
      this.message.setSelectionRange(Math.min(at, text.length), Math.min(at, text.length));
    }
    this.counter.textContent = counterText(countCharacters(text));
    if (text !== this.design.message) this.update({ ...this.design, message: text });
  }

  // ── «Crea il mio disco» ───────────────────────────────────────────────────

  private async makeDisc(): Promise<void> {
    if (this.create.disabled) return;
    const run = ++this.ceremony;
    this.create.disabled = true;
    await fontsReady();
    // On a phone the disc is above the steps: bring it into view before the needle starts.
    const box = this.disc.element.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      const smooth = this.options.motion === 'full';
      this.disc.element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
      if (smooth) await wait(550);
    }
    if (run !== this.ceremony) return;
    // The grooves, cut while the sound plays: the needle stands on the groove of the moment.
    const sound = this.design.sound;
    const playing = sound ? this.play(sound) : null;
    const clock: Clock = playing ? () => playing.elapsed() : clockFromNow();
    const cut = { ...this.design, made: true };
    this.design = cut;
    await this.disc.cut(cut, clock, playing?.duration ?? SILENT_CUT);
    if (run !== this.ceremony) return;
    // Then the words, letter by letter.
    this.design = { ...this.design, engraving: this.engraving() };
    await this.disc.write(this.design, WRITING);
    if (run !== this.ceremony) return;
    this.finishMaking();
    this.save.focus({ preventScroll: true });
  }

  /** The disc is made: «Crea il mio disco» gives way to «Ascolta» and «Salva il disco». */
  private finishMaking(): void {
    this.create.hidden = true;
    this.create.disabled = false;
    this.actions.hidden = false;
    this.mark();
  }

  // ── «Ascolta» and «Salva il disco» ────────────────────────────────────────

  private toggleListening(): void {
    if (this.listening) {
      this.silence();
      return;
    }
    const sound = this.design.sound;
    if (!sound) return;
    const playing = this.play(sound);
    if (!playing) return;
    this.setListening(true);
    this.disc.listen(() => playing.elapsed(), playing.duration);
  }

  private setListening(on: boolean): void {
    if (this.listening === on) return;
    this.listening = on;
    this.listen.setAttribute('aria-pressed', String(on));
    this.listen.querySelector('.icon')?.replaceWith(icon(on ? 'stop' : 'forward'));
    if (!on) this.disc.listen(null);
  }

  private async saveDisc(): Promise<void> {
    if (this.save.getAttribute('aria-busy') === 'true') return;
    this.save.setAttribute('aria-busy', 'true');
    // A frame to show it is working, then the picture (a moment on a tablet).
    await wait(30);
    try {
      const blob = await discPng(this.design);
      if (blob && this.open) download(blob);
    } finally {
      this.save.removeAttribute('aria-busy');
    }
  }
}
