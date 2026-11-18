/**
 * Text with superscripts and inline icons, without ever touching innerHTML.
 *
 * - `10^{7} m` becomes 10<sup>7</sup> m. Real <sup> elements keep every exponent in the same
 *   font (Unicode superscript digits come from fallback fonts and look uneven).
 * - ▶ and ◀ become small drawn triangles: as characters, some systems turn them into emoji.
 */
import { icon } from './dom.ts';

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** A space where a line must not break. */
export const NBSP = '\u00a0';

/**
 * Prepares a content text for display: Unicode superscripts become `^{…}` (see above) and
 * straight apostrophes become typographic ones. A number never stands alone at the start
 * or at the end of a line: it stays with the short word before it («per 10», «di 384.000»)
 * and with the word after it («10 anni»). The words are never changed.
 */
export function typeset(text: string): string {
  return text
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (run) => `^{${[...run].map((c) => SUPERSCRIPT_DIGITS.indexOf(c)).join('')}}`)
    .replace(/(?<=\p{L})'(?=\p{L}|\p{N}|\s|$)/gu, '’')
    .replace(/(^|[\s(«“])(\p{L}{1,3}) (?=\d)/gu, `$1$2${NBSP}`)
    .replace(/(\d(?:\^\{[^}]*\})?) (?=\p{L})/gu, `$1${NBSP}`);
}

export function setRich(element: HTMLElement, text: string): void {
  element.textContent = '';
  const parts = text.split(/\^\{([^}]*)\}/);
  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      const sup = document.createElement('sup');
      sup.textContent = part;
      element.append(sup);
      return;
    }
    for (const piece of part.split(/([▶◀])/)) {
      if (piece === '▶' || piece === '◀') {
        const mark = icon(piece === '▶' ? 'forward' : 'back');
        mark.classList.add('icon--inline');
        element.append(mark);
      } else if (piece) {
        element.append(piece);
      }
    }
  });
}
