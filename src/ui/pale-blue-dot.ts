/**
 * The real photo «Pale Blue Dot» (Voyager 1, 14 February 1990; the NASA/JPL version of
 * 2020), at the end of the «saperne di più» of `pianeti-lontani`, whose text tells its story.
 *
 * The Earth is a speck inside a sunbeam: a thin warm circle (the colour of «Tu sei qui»)
 * shows where, drawn over the photo and not into it. The picture is a square crop around
 * the sunbeam made by scripts/textures.mjs, which also prints where the Earth falls in it.
 * It comes from the site itself and loads only when the expansion is near the screen.
 */
import { LABELS } from '../content/labels.ts';
import { el } from './dom.ts';

/** Where the Earth is in public/images/pale-blue-dot.webp, as a share of its side. */
const EARTH = { x: 0.5313, y: 0.5 } as const;
const SIDE = 900;

export function buildPaleBlueDot(): HTMLElement {
  const figure = el('figure', 'pale-blue-dot');
  const frame = el('div', 'pale-blue-dot__frame');
  const image = el('img');
  image.src = new URL('images/pale-blue-dot.webp', document.baseURI).href;
  image.alt = LABELS.paleBlueDot.alt;
  image.width = SIDE;
  image.height = SIDE;
  image.loading = 'lazy';
  image.decoding = 'async';
  const ring = el('span', 'pale-blue-dot__ring');
  ring.setAttribute('aria-hidden', 'true');
  ring.style.left = `${(EARTH.x * 100).toFixed(2)}%`;
  ring.style.top = `${(EARTH.y * 100).toFixed(2)}%`;
  frame.append(image, ring);
  const caption = el('figcaption', 'pale-blue-dot__caption');
  caption.append(el('span', undefined, LABELS.paleBlueDot.caption), el('span', 'pale-blue-dot__credit', LABELS.paleBlueDot.credit));
  figure.append(frame, caption);
  return figure;
}
