/** Small DOM helpers shared by the interface. */

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Icons are drawn here, as paths on a 24 × 24 grid, so they never depend on a font. */
const ICONS = {
  // Rounded triangles: the ▶ and ◀ of the texts.
  forward: 'M8.2 4.9c0-1.2 1.3-1.9 2.3-1.3l10.2 6.9c.9.6.9 1.9 0 2.5l-10.2 7c-1 .6-2.3-.1-2.3-1.3z',
  back: 'M15.8 4.9c0-1.2-1.3-1.9-2.3-1.3L3.3 10.5c-.9.6-.9 1.9 0 2.5l10.2 7c1 .6 2.3-.1 2.3-1.3z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M6 9.5l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
} as const;

export type IconName = keyof typeof ICONS;

const STROKED: ReadonlySet<IconName> = new Set(['plus', 'chevron', 'close']);

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon', `icon--${name}`);
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', ICONS[name]);
  if (STROKED.has(name)) {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  } else {
    path.setAttribute('fill', 'currentColor');
  }
  svg.append(path);
  return svg;
}

/** A real <button>, with an accessible name when the visible content is only an icon. */
export function button(className: string, label?: string): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
}
