/**
 * Text with superscripts, without ever touching innerHTML: `10^{7} m` becomes 10<sup>7</sup> m.
 * Real <sup> elements keep every exponent in the same font (Unicode superscript digits
 * come from different fonts and look uneven).
 */
export function setRich(element: HTMLElement, text: string): void {
  element.textContent = '';
  const parts = text.split(/\^\{([^}]*)\}/);
  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      const sup = document.createElement('sup');
      sup.textContent = part;
      element.append(sup);
    } else {
      element.append(part);
    }
  });
}
