/**
 * «Crea il tuo Disco d'oro»: the lab under the story of the Golden Record. One page, with
 * her disc next to the choices and changing as she makes them: the picture appears on the
 * label, the message is engraved around the edge as she types (the disc stops still with
 * the words upright while she writes). The three steps are big tiles made for a finger,
 * real radio buttons inside a fieldset, so keyboards and screen readers work by themselves.
 *
 * Nothing is stored: her disc lives as long as the page is open.
 */
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { UI } from '../content/ui.ts';
import type { CivilDate } from '../personalization.ts';
import { el } from '../ui/dom.ts';
import { RecordDisc, type DiscMotion } from '../ui/record-disc.ts';
import { setRich, typeset } from '../ui/rich-text.ts';
import { EMPTY_DESIGN, clampMessage, countCharacters, counterText, type DiscDesign, type PictureId, type SoundId } from './design.ts';
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

export class Lab {
  readonly element = el('section', 'sheet lab');
  readonly heading = el('h2', 'lab__title');
  readonly disc: RecordDisc;
  protected readonly options: LabOptions;
  private design: DiscDesign = EMPTY_DESIGN;
  private readonly pictureTiles: Tile<PictureId>[];
  private readonly soundTiles: Tile<SoundId>[];
  private readonly message = el('textarea', 'lab__message');
  private readonly counter = el('p', 'lab__counter');
  readonly create = el('button', 'cta lab__create');
  readonly actions = el('div', 'lab__actions');
  private playing: Playing | null = null;
  private composing = false;

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
    const holder = el('div', 'lab__holder');
    this.actions.hidden = true;
    holder.append(this.disc.element, this.actions);
    const discColumn = el('div', 'lab__disc-column');
    discColumn.append(holder);

    // 1. The picture.
    this.pictureTiles = GOLDEN_RECORD.images.map((image) => tile('lab-picture', image.id, image.label, pictureSvg(image.id)));
    for (const t of this.pictureTiles) t.input.addEventListener('change', () => this.choosePicture(t.id));
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

    this.create.type = 'button';
    this.create.textContent = GOLDEN_RECORD.actions.create;

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
    this.disc.start();
    void fontsReady().then(() => this.disc.setDesign(this.design));
  }

  /** The page is closed: silence, and the disc rests. */
  hidden(): void {
    this.silence();
    this.disc.stop();
  }

  get current(): DiscDesign {
    return this.design;
  }

  protected update(design: DiscDesign): void {
    this.design = design;
    this.disc.setDesign(design);
    for (const t of this.pictureTiles) t.element.classList.toggle('is-chosen', t.id === design.picture);
    for (const t of this.soundTiles) t.element.classList.toggle('is-chosen', t.id === design.sound);
  }

  private choosePicture(id: PictureId): void {
    this.update({ ...this.design, picture: id });
  }

  private chooseSound(id: SoundId): void {
    // Touching the sound that is playing stops it.
    if (this.playing?.id === id) {
      this.silence();
      return;
    }
    this.update({ ...this.design, sound: id });
    this.play(id);
  }

  /** Plays a sound (from a tap), with the line running along the shape on its tile. */
  protected play(id: SoundId): Playing | null {
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
      if (this.playing === playing) this.playing = null;
    });
    return playing;
  }

  protected silence(): void {
    const playing = this.playing;
    this.playing = null;
    playing?.stop();
    for (const t of this.soundTiles) t.element.classList.remove('is-playing');
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
}
