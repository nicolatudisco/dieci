#!/usr/bin/env node
/**
 * An accessibility check of every view of the site, with no dependencies: what a child
 * with a screen reader, a keyboard or weak eyes would meet.
 *
 * Usage, from the project root:
 *   npm run a11y                       every view, phone and desktop
 *   npm run a11y -- --viewports phone
 *
 * In each view (opening, a few stops, the live panel of Voyager, the bubble, finale,
 * epilogue, the pages of the sources and of the Golden Record, its lab):
 *   - every control that can be reached has an accessible name;
 *   - every control is at least 44 CSS pixels in both directions (48 is the aim: a warning
 *     below it); links inside running text are exempt;
 *   - text has enough contrast against what is behind it (4.5:1, or 3:1 when large);
 *   - images have a text alternative; the page has its language and a heading;
 *   - with the keyboard, the focus is always visible.
 * Exit code 1 if anything fails (warnings do not fail).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const at = argv.indexOf('--viewports');
const viewports = (at >= 0 ? argv[at + 1] : 'phone,desktop').split(',');
const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const VIEWS = [
  ['apertura', 'stop=apertura'],
  ['partenza', 'stop=partenza'],
  ['voyager', 'stop=voyager'],
  ['bolla', 'stop=bolla'],
  ['googol', 'stop=googol'],
  ['finale', 'stop=finale'],
  ['epilogo', 'stop=epilogo'],
  ['fonti', 'stop=fonti'],
  ['disco', 'stop=disco'],
  ['laboratorio', 'stop=disco&disco=laboratorio'],
  ['disco fatto', 'stop=disco&disco=fatto'],
];

/** Runs in the page: the problems of what is on screen now. */
function audit() {
  const problems = [];
  const warnings = [];
  let checkedControls = 0;
  let checkedTexts = 0;
  const visible = (node) => {
    if (node.closest('[inert], [aria-hidden="true"], [hidden]')) return false;
    const style = getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    for (let n = node; n; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return false;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  // For the eyes: what a screen reader skips (labels of the scene, «Tu sei qui») is still seen.
  const seenByEyes = (node) => {
    if (node.closest('[hidden]')) return false;
    const style = getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    for (let n = node; n; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return false;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
  };
  const label = (node) => {
    const by = node.getAttribute('aria-labelledby');
    if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
    if (node.getAttribute('aria-label')) return node.getAttribute('aria-label').trim();
    if (node.labels?.length) return [...node.labels].map((l) => l.textContent).join(' ').trim();
    return (node.textContent || node.title || node.getAttribute('alt') || '').trim();
  };
  const describe = (node) => `${node.tagName.toLowerCase()}${node.className && typeof node.className === 'string' ? '.' + node.className.trim().split(/\s+/).join('.') : ''} «${label(node).slice(0, 40)}»`;

  // Controls: a name, and room for a finger.
  const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')];
  for (const node of controls) {
    // A radio button hidden inside its tile: the tile is what a finger touches.
    const target = node.matches('input[type=radio]') ? node.closest('label') : node;
    if (!target || !visible(target)) continue;
    checkedControls++;
    if (!label(node)) problems.push(`senza nome: ${describe(node)}`);
    const inline = node.matches('a') && node.closest('p, li');
    if (inline) continue;
    const box = target.getBoundingClientRect();
    const small = Math.min(box.width, box.height);
    if (small < 44) problems.push(`troppo piccolo (${box.width.toFixed(0)}×${box.height.toFixed(0)}): ${describe(node)}`);
    else if (small < 48) warnings.push(`sotto i 48 px (${box.width.toFixed(0)}×${box.height.toFixed(0)}): ${describe(node)}`);
  }

  // Images and the page itself.
  for (const img of document.querySelectorAll('img')) if (visible(img) && !img.hasAttribute('alt')) problems.push(`immagine senza testo alternativo: ${img.src}`);
  if (!document.documentElement.lang) problems.push('la pagina non dice la sua lingua');
  if (!document.querySelector('h1')) problems.push('nessun titolo h1');

  // Contrast of text against the first solid background behind it (the night if none).
  const parse = (color) => {
    const m = /rgba?\(([^)]+)\)/.exec(color);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const luminance = ({ r, g, b }) => {
    const c = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const night = { r: 5, g: 6, b: 13, a: 1 };
  const backdrop = (node) => {
    const layers = [];
    for (let n = node; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) layers.push(bg);
      if (bg && bg.a >= 0.99) break;
    }
    return layers.reverse().reduce((acc, layer) => over(layer, acc), night);
  };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const node = text.parentElement;
    if (!node || !text.textContent.trim() || !seenByEyes(node) || node.closest('.sr-only, canvas, svg, .lens__caption--probe')) continue;
    const style = getComputedStyle(node);
    const fg = parse(style.color);
    if (!fg) continue;
    checkedTexts++;
    const bg = backdrop(node);
    const color = over(fg, bg);
    const [hi, lo] = [luminance(color), luminance(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    const key = `${style.color}|${size}|${ratio.toFixed(1)}`;
    if (ratio < need && !seen.has(key)) {
      seen.add(key);
      problems.push(`contrasto ${ratio.toFixed(2)}:1 (serve ${need}) a ${size.toFixed(0)} px: «${text.textContent.trim().slice(0, 40)}»`);
    }
  }
  return { problems, warnings, checked: `${checkedControls} comandi, ${checkedTexts} testi` };
}

const vite = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 5196, strictPort: false } });
let browser;
let failed = 0;
try {
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/?$/, '/');
  browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  for (const name of viewports) {
    const context = await browser.newContext(VIEWPORTS[name]);
    const page = await context.newPage();
    for (const [view, query] of VIEWS) {
      await page.goto(`${base}?${query}&static=1`);
      await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 60000 });
      await page.waitForTimeout(400);
      const { problems, warnings, checked } = await page.evaluate(audit);
      // With the keyboard: the first stops of the focus are always visible.
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const node = document.activeElement;
          if (!node || node === document.body) return null;
          const style = getComputedStyle(node);
          const ring = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
          // A radio button hidden in its tile shows its focus on the tile.
          const tile = node.matches('input[type=radio]') ? getComputedStyle(node.closest('label')).outlineStyle !== 'none' : false;
          return { ring: ring || tile, name: `${node.tagName.toLowerCase()}.${node.className}` };
        });
        if (focus && !focus.ring) problems.push(`fuoco non visibile su ${focus.name}`);
      }
      const unique = [...new Set(problems)];
      failed += unique.length;
      console.log(`[${name}] ${view} (${checked}): ${unique.length ? `${unique.length} problemi` : 'a posto'}${warnings.length ? `, ${warnings.length} avvisi` : ''}`);
      for (const p of unique) console.log(`    ✖ ${p}`);
      for (const w of [...new Set(warnings)]) console.log(`    · ${w}`);
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await vite.close();
}
console.log(failed ? `\n${failed} problemi.` : '\nNessun problema.');
process.exitCode = failed ? 1 : 0;
