/**
 * «È tutto vero»: the page of the sources. Generated from every `sources` field of the
 * content (the stops, the Golden Record) and from CREDITS.md, so it can never fall behind.
 */
import credits from '../../CREDITS.md?raw';
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { STOPS } from '../content/levels.ts';
import type { Source } from '../content/types.ts';
import { UI } from '../content/ui.ts';
import { button, el, icon } from './dom.ts';
import type { OverlayPage } from './overlay.ts';
import { setRich, typeset } from './rich-text.ts';

function link(text: string, url: string): HTMLAnchorElement {
  const a = el('a', undefined, text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function sourceList(sources: readonly Source[]): HTMLUListElement {
  const list = el('ul', 'sources__list');
  for (const source of sources) {
    const item = el('li');
    item.append(link(typeset(source.title), source.url));
    list.append(item);
  }
  return list;
}

/** Appends a line of Markdown with `[text](url)` links, without ever using innerHTML. */
function appendInline(parent: HTMLElement, text: string): void {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    parent.append(text.slice(last, match.index));
    parent.append(link(match[1] ?? '', match[2] ?? ''));
    last = match.index + match[0].length;
  }
  parent.append(text.slice(last).replaceAll('`', ''));
}

/**
 * The sections of CREDITS.md that have something to say: `## title` followed by list items
 * or paragraphs. Lines in _(italics between brackets)_ are notes to ourselves and are skipped.
 */
function creditSections(markdown: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  let section: HTMLElement | null = null;
  let list: HTMLUListElement | null = null;
  let filled = false;
  const flush = (): void => {
    if (section && filled) out.push(section);
    section = null;
    list = null;
    filled = false;
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flush();
      section = el('section', 'sources__group');
      section.append(el('h3', undefined, line.slice(3)));
      continue;
    }
    if (!section || !line || line.startsWith('#') || line.startsWith('_(')) {
      if (!line) list = null;
      continue;
    }
    if (line.startsWith('- ')) {
      if (!list) {
        list = el('ul', 'sources__list');
        section.append(list);
      }
      const item = el('li');
      appendInline(item, line.slice(2));
      list.append(item);
    } else {
      list = null;
      const p = el('p');
      appendInline(p, line);
      section.append(p);
    }
    filled = true;
  }
  flush();
  return out;
}

export function buildSources(titleId: string, close: () => void): OverlayPage {
  const page = el('article', 'sheet sources');
  const title = el('h1', 'sheet__title', UI.sourcesPage.title);
  title.id = titleId;
  const intro = el('p', 'sheet__intro');
  setRich(intro, typeset(UI.sourcesPage.intro));
  page.append(title, intro);

  for (const stop of STOPS) {
    if (stop.sources.length === 0) continue;
    const group = el('section', 'sources__group');
    const heading = el('h2');
    setRich(heading, typeset(stop.title));
    group.append(heading, sourceList(stop.sources));
    page.append(group);
  }
  const record = el('section', 'sources__group');
  record.append(el('h2', undefined, GOLDEN_RECORD.title), sourceList(GOLDEN_RECORD.sources));
  page.append(record);

  const sections = creditSections(credits);
  if (sections.length > 0) {
    const group = el('section', 'sources__credits');
    group.append(el('h2', undefined, UI.sourcesPage.credits), ...sections);
    page.append(group);
  }

  const back = button('cta sheet__back');
  back.append(icon('back'), el('span', undefined, UI.sourcesPage.back));
  back.addEventListener('click', close);
  page.append(back);
  return { element: page };
}
