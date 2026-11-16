/**
 * The epilogue: what she can do after the journey. «Rifai il viaggio», the Golden Record
 * («Che cosa porta con sé Voyager?» for the story; «Crea il tuo Disco d'oro» once the lab
 * exists, M7) and «È tutto vero? Guarda le fonti».
 */
import { LABELS } from '../content/labels.ts';
import { UI } from '../content/ui.ts';
import { button, el, icon } from './dom.ts';
import { GOLDEN_RECORD_LAB_READY } from './golden-record.ts';

export interface EpilogueOptions {
  readonly replay: () => void;
  readonly openSources: () => void;
  readonly openGoldenRecord: () => void;
  readonly go: (dir: 1 | -1) => void;
}

export class Epilogue {
  readonly element = el('section', 'view epilogue');
  /** The empty cell around the warm dot: the free area during the epilogue. */
  readonly star = el('div', 'epilogue__star');
  private opacity = -1;

  constructor(options: EpilogueOptions) {
    const choices = el('div', 'epilogue__choices');
    const replay = button('cta');
    replay.textContent = UI.end.replay;
    replay.addEventListener('click', options.replay);
    choices.append(replay);
    const record = button('choice epilogue__record');
    record.textContent = GOLDEN_RECORD_LAB_READY ? UI.end.goldenRecord : LABELS.goldenRecordStory;
    record.addEventListener('click', options.openGoldenRecord);
    choices.append(record);
    const sources = button('choice');
    sources.textContent = UI.end.sources;
    sources.addEventListener('click', options.openSources);
    choices.append(sources);

    const nav = el('nav', 'view__nav');
    const back = button('ghost', LABELS.back);
    back.append(icon('back'));
    back.addEventListener('click', () => options.go(-1));
    nav.append(back);

    this.element.append(this.star, choices, nav);
  }

  setOpacity(value: number): void {
    const opacity = Math.round(value * 100) / 100;
    if (opacity === this.opacity) return;
    this.opacity = opacity;
    this.element.style.opacity = String(opacity);
    // Not `hidden`: the layout must stay, because the empty cell is measured as free area.
    this.element.style.visibility = opacity <= 0 ? 'hidden' : 'visible';
    this.element.inert = opacity < 0.9;
  }
}
