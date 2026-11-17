#!/usr/bin/env node
/**
 * Smoke test of the whole journey in a real browser, the way a child would do it:
 * «Inizia il viaggio», then ▶ and nothing else, all the way to the epilogue. Then the
 * pages on top, the keyboard, the wheel.
 *
 * Usage, from the project root:
 *   npm run smoke                 software rendering (slow, the same on every computer)
 *   npm run smoke -- --gpu        real GPU
 *   npm run smoke -- --headed     show the browser window
 *   npm run smoke -- --url http://localhost:5173   use a dev server that is already running
 *
 * It checks that: every stop is reached in order with ▶ alone; the caption shows the title
 * of the stop; the counter shows its exponent and ticks once for every power of ten, in
 * order, with none skipped; the finale and the epilogue are reached; the pages on top open
 * and close and give the journey back where it was; nothing is logged as an error.
 * Exit code 1 if anything fails.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const args = new Set(process.argv.slice(2));
const urlIndex = process.argv.indexOf('--url');
const givenUrl = urlIndex > 0 ? process.argv[urlIndex + 1] : null;

const failures = [];
const pass = (message) => console.log(`  ✓ ${message}`);
const check = (condition, message) => {
  if (condition) pass(message);
  else {
    failures.push(message);
    console.log(`  ✖ ${message}`);
  }
};

/** What a text of the content looks like once it is on screen (see ui/rich-text.ts). */
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const shown = (text) =>
  text
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUPERSCRIPTS.indexOf(c)))
    .replaceAll('’', "'")
    .trim();

const vite = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 5198, strictPort: false } });
let browser;
try {
  const { STOPS } = await vite.ssrLoadModule('/src/content/levels.ts');
  const { FINALE, FINALE_IS_PLACEHOLDER } = await vite.ssrLoadModule('/src/content/finale.ts');
  let base = givenUrl;
  if (!base) {
    await vite.listen();
    base = vite.resolvedUrls?.local?.[0];
  }
  base = base.replace(/\/?$/, '/');

  const flags = args.has('--gpu') ? ['--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  browser = await launch(flags);
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  // Records every value the exponent of the counter takes, in order.
  await page.addInitScript(() => {
    window.__ticks = [];
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('counter__digit')) window.__ticks.push(node.textContent);
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });

  const at = (id, timeout = 9000) => page.waitForFunction((expected) => document.documentElement.dataset.at === expected, id, { timeout }).then(() => true, () => false);
  const text = (selector) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', selector);
  const whereAt = () => page.evaluate(() => document.documentElement.dataset.at ?? '');

  console.log('\nApertura');
  await page.goto(base);
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30000 });
  check((await whereAt()) === 'apertura', 'la pagina si apre sull’apertura');
  check((await page.locator('.intro__line').count()) >= 3, 'le righe dell’apertura ci sono');
  await page.mouse.click(60, 60);
  await page.click('.intro__start');
  check(await at('partenza', 12000), '«Inizia il viaggio» porta alla prima tappa');

  console.log('\nIl viaggio, solo con ▶');
  const stops = STOPS;
  let reachedAll = true;
  for (const [index, stop] of stops.entries()) {
    if (index > 0) {
      await page.click('.nav-button--forward');
      if (!(await at(stop.id))) {
        reachedAll = false;
        check(false, `▶ porta a «${stop.id}» (siamo a «${await whereAt()}»)`);
        break;
      }
    }
    await page.waitForFunction(() => !document.querySelector('.caption')?.classList.contains('is-hidden'), null, { timeout: 3000 }).catch(() => undefined);
    const title = shown(await text('.caption__title'));
    const exponent = await page.evaluate(() => [...document.querySelectorAll('.counter__digit:not(.is-leaving)')].at(-1)?.textContent ?? '');
    const expected = stop.kind === 'space' ? String(Math.round(stop.exponent)) : stop.exponentLabel ? stop.exponentLabel.replace(/^10\^/, '') : String(stop.exponent);
    if (title !== shown(stop.title)) check(false, `«${stop.id}»: titolo «${title}» invece di «${shown(stop.title)}»`);
    if (exponent !== expected) check(false, `«${stop.id}»: il contatore mostra 10^${exponent} invece di 10^${expected}`);
  }
  if (reachedAll) pass(`${stops.length} tappe raggiunte in ordine, con titolo ed esponente giusti`);

  const ticks = await page.evaluate(() => window.__ticks);
  const wanted = [...Array.from({ length: 28 }, (_, n) => String(n)), '30', '80', '100', 'googol'];
  check(JSON.stringify(ticks) === JSON.stringify(wanted), `il contatore è scattato a ogni potenza di 10, in ordine (${ticks.length} valori)`);
  if (JSON.stringify(ticks) !== JSON.stringify(wanted)) console.log(`    visti: ${ticks.join(' ')}`);

  console.log('\nFinale ed epilogo');
  await page.click('.nav-button--forward');
  check(await at('finale'), '▶ dall’ultima tappa porta al finale');
  const message = await text('.finale__message');
  check(message.trim().length > 0, FINALE_IS_PLACEHOLDER ? `il finale mostra il segnaposto («${message.trim()}»)` : 'il finale mostra il messaggio');
  if (FINALE_IS_PLACEHOLDER) check(message.includes('TODO'), 'il segnaposto del finale è evidente');
  if (!FINALE_IS_PLACEHOLDER) {
    // The message comes line by line: ▶ brings the next line and never skips to the epilogue.
    const said = () => page.evaluate(() => document.querySelector('.finale').dataset.complete === '1');
    const lines = await page.evaluate(() => document.querySelectorAll('.finale__message .finale__line').length);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(600);
    check((await whereAt()) === 'finale' && !(await said()), '▶ sul finale porta la riga dopo, non salta il messaggio');
    await page.mouse.move(300, 400);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(700);
    check((await whereAt()) === 'finale', 'nemmeno la rotella salta il messaggio');
    for (let presses = 0; presses < 30 && !(await said()); presses++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(520);
    }
    const shown = await page.evaluate(() => ({
      on: document.querySelectorAll('.finale__message .finale__line.is-on').length,
      text: document.querySelector('.finale__message').innerText,
      next: !document.querySelector('.finale__next').disabled,
    }));
    const words = (value) => value.replaceAll('’', "'").split(/\s+/).filter(Boolean).join(' ');
    check(shown.on === lines && lines > 0, `alla fine tutte le righe del messaggio sono a schermo (${shown.on} su ${lines})`);
    check(words(shown.text) === words(FINALE.message), 'il testo a schermo è quello di finale.ts, parola per parola');
    check(shown.next, '«Continua» compare quando il messaggio è completo');
  }
  await page.keyboard.press('ArrowRight');
  check(await at('epilogo'), 'dal finale si arriva all’epilogo');

  console.log('\nPagine sovrapposte');
  await page.click('.epilogue .choice:last-of-type');
  await page.waitForTimeout(300);
  const sources = await page.evaluate(() => ({ open: !document.querySelector('.overlay').hidden, links: document.querySelectorAll('.sources a').length, inert: document.querySelector('.stage').inert }));
  check(sources.open && sources.links > 10, `«Guarda le fonti» apre la pagina delle fonti (${sources.links} link)`);
  check(sources.inert, 'con la pagina aperta il viaggio sotto è fermo');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.querySelector('.overlay').hidden), 'Esc chiude la pagina');
  check((await whereAt()) === 'epilogo', 'chiusa la pagina si è ancora nello stesso punto');
  await page.click('.epilogue__record');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => !document.querySelector('.overlay').hidden && document.querySelector('.record') !== null), 'dall’epilogo si apre il Disco d’oro');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check((await page.evaluate(() => document.querySelector('.overlay').hidden)) && (await whereAt()) === 'epilogo', 'chiuso il Disco d’oro si è ancora all’epilogo');

  console.log('\nTastiera e rotella');
  await page.keyboard.press('ArrowLeft');
  check(await at('finale'), '← torna al finale');
  await page.keyboard.press('ArrowLeft');
  check(await at(stops.at(-1).id), '← torna all’ultima tappa');
  await page.keyboard.press('ArrowLeft');
  check(await at(stops.at(-2).id), '← torna alla tappa prima');

  await page.goto(`${base}?stop=voyager`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30000 });
  await page.mouse.move(300, 400);
  const before = await text('.counter__width');
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(900);
  const after = await text('.counter__width');
  check(before !== after, `la rotella cambia la scala (${before} → ${after})`);
  await page.keyboard.press('ArrowLeft');
  check(await at('voyager'), '← da un punto qualsiasi torna alla tappa prima');
  await page.click('.caption__extra button');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => !document.querySelector('.overlay').hidden && document.querySelector('.record') !== null), 'dalla tappa Voyager si apre il Disco d’oro');
  await page.click('.sheet__back');
  await page.waitForTimeout(200);
  check((await page.evaluate(() => document.querySelector('.overlay').hidden)) && (await whereAt()) === 'voyager', '«Torna al viaggio» riporta alla tappa Voyager');

  console.log('\nConsole');
  check(errors.length === 0, errors.length === 0 ? 'nessun errore in console' : `errori in console: ${errors.slice(0, 3).join(' | ')}`);

  await context.close();
} finally {
  await browser?.close();
  await vite.close();
}

console.log(failures.length === 0 ? '\nTutto bene.\n' : `\n${failures.length} controlli falliti.\n`);
process.exitCode = failures.length === 0 ? 0 : 1;

async function launch(flags) {
  const attempts = [];
  if (process.env.CHROME_PATH) attempts.push({ executablePath: process.env.CHROME_PATH });
  attempts.push({ channel: 'chrome' }, {});
  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, headless: !args.has('--headed'), args: flags });
    } catch (error) {
      lastError = error;
    }
  }
  console.error(`\n✖ Non trovo un browser da usare. Installa Google Chrome, oppure esegui: npx playwright install chromium\n\n${lastError}\n`);
  process.exit(2);
}
