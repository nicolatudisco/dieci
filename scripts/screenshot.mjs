#!/usr/bin/env node
/**
 * Screenshots of the journey on desktop, tablet and phone, so that Claude (and Nicola)
 * can look at every scale without clicking through by hand.
 *
 * Usage, from the project root:
 *   npm run shots                                  every stop in levels.ts, then the five views
 *   npm run shots -- --stops partenza,bolla        only these stops (uses ?stop=<id>)
 *   npm run shots -- --stops apertura,finale       the views work too: apertura, finale, epilogo, fonti, disco
 *   npm run shots -- --u 28,30,36                  positions of the journey axis (uses ?u=<pos>): Act II transitions
 *   npm run shots -- --from 0 --to 27 --step 0.5   a range of exponents (uses ?s=<e>)
 *   npm run shots -- --scales 0,7.2,13.7           explicit exponents
 *   npm run shots -- --viewports phone,tablet      desktop | tablet | phone
 *   npm run shots -- --gpu                         real GPU instead of SwiftShader (faster)
 *   npm run shots -- --headed                      show the browser window
 *   npm run shots -- --url http://localhost:5173   use a dev server that is already running
 *   npm run shots -- --extra debug=1               extra query parameters
 *   npm run shots -- --hash nata=2016-05-20        link fragment (#nome=…&nata=…): use invented dates only
 *   npm run shots -- --wait 1500                   extra ms after data-ready (default 600)
 *   npm run shots -- --keep                        do not delete previous screenshots
 *
 * Output (git-ignored):
 *   screenshots/<viewport>/<nn>-<label>.png   one image per shot
 *   screenshots/contact-<viewport>.png         all shots of a viewport on one sheet
 *   screenshots/report.json                    URL, file and console errors of every shot
 *
 * The page must respect the URL contract in CLAUDE.md: ?s, ?stop, ?static=1 and
 * document.documentElement.dataset.ready = '1' after the first frame.
 * Exit code 1 if any shot logged console errors or never became ready.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

/** Views that are not stops but can be opened with ?stop=<id> (see CLAUDE.md, «Contratto URL»). */
const VIEWS = ['apertura', 'finale', 'epilogo', 'fonti', 'disco'];

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args.out ?? 'screenshots');
const waitMs = Number(args.wait ?? 600);
const readyTimeoutMs = Number(args.timeout ?? 30000);
const viewportNames = String(args.viewports ?? 'desktop,tablet,phone')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

for (const name of viewportNames) {
  if (!(name in VIEWPORTS)) fail(`Viewport sconosciuto: "${name}". Usa: ${Object.keys(VIEWPORTS).join(', ')}`);
}

// Vite is used both to load the content files (TypeScript) and, unless --url is given, to serve the site.
const vite = await createServer({
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 5199, strictPort: false },
});

let browser;
try {
  const { STOPS } = await vite.ssrLoadModule('/src/content/levels.ts');
  const targets = buildTargets(args, STOPS);
  if (targets.length === 0) fail('Nessuna scala da fotografare.');

  let baseUrl = args.url;
  if (!baseUrl) {
    await vite.listen();
    baseUrl = vite.resolvedUrls?.local?.[0];
    if (!baseUrl) fail('Il server di Vite non ha restituito un indirizzo.');
  }
  baseUrl = baseUrl.replace(/\/?$/, '/');

  if (!args.keep) fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  browser = await launchBrowser();
  const results = [];

  for (const vpName of viewportNames) {
    const context = await browser.newContext(VIEWPORTS[vpName]);
    const page = await context.newPage();
    let errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    fs.mkdirSync(path.join(outDir, vpName), { recursive: true });

    for (const [index, target] of targets.entries()) {
      errors = [];
      const query = new URLSearchParams(target.query);
      query.set('static', '1');
      if (args.extra) for (const [k, v] of new URLSearchParams(String(args.extra))) query.set(k, v);
      const url = `${baseUrl}?${query.toString()}${args.hash ? `#${args.hash}` : ''}`;
      const file = path.join(outDir, vpName, `${String(index).padStart(2, '0')}-${target.label}.png`);

      await page.goto(url, { waitUntil: 'load' });
      try {
        await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, {
          timeout: readyTimeoutMs,
        });
      } catch {
        errors.push(`TIMEOUT: data-ready non impostato entro ${readyTimeoutMs} ms`);
      }
      await page.waitForTimeout(waitMs);
      await page.screenshot({ path: file });

      results.push({ viewport: vpName, label: target.label, url, file: path.relative(process.cwd(), file), errors: [...errors] });
      const mark = errors.length ? `  ⚠ ${errors.length} errori` : '';
      console.log(`[${vpName}] ${target.label}${mark}`);
    }

    await context.close();
    await writeContactSheet(browser, vpName, results.filter((r) => r.viewport === vpName));
  }

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));

  const withErrors = results.filter((r) => r.errors.length > 0);
  console.log(`\n${results.length} screenshot in ${path.relative(process.cwd(), outDir)}/`);
  for (const vpName of viewportNames) console.log(`  foglio riassuntivo: ${path.relative(process.cwd(), path.join(outDir, `contact-${vpName}.png`))}`);
  if (withErrors.length) {
    console.log(`\n${withErrors.length} screenshot con errori in console:`);
    for (const r of withErrors) console.log(`  [${r.viewport}] ${r.label}: ${r.errors.slice(0, 3).join(' | ')}`);
    process.exitCode = 1;
  } else {
    console.log('Nessun errore in console.');
  }
} finally {
  await browser?.close();
  await vite.close();
}

// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function buildTargets(a, stops) {
  const fmt = (n, prefix = 's') => `${prefix}${String(n).replace('-', 'm').replace('.', '_')}`;
  if (a.u) {
    return String(a.u)
      .split(',')
      .map(Number)
      .filter(Number.isFinite)
      .map((n) => ({ label: fmt(n, 'u'), query: { u: String(n) } }));
  }
  if (a.scales) {
    return String(a.scales)
      .split(',')
      .map(Number)
      .filter(Number.isFinite)
      .map((n) => ({ label: fmt(n), query: { s: String(n) } }));
  }
  if (a.from !== undefined || a.to !== undefined) {
    const from = Number(a.from ?? 0);
    const to = Number(a.to ?? 27);
    const step = Number(a.step ?? 1);
    if (!(step > 0)) fail('--step deve essere maggiore di 0');
    const list = [];
    for (let n = from; n <= to + 1e-9; n += step) {
      const v = Math.round(n * 1000) / 1000;
      list.push({ label: fmt(v), query: { s: String(v) } });
    }
    return list;
  }
  const known = [...stops.map((s) => s.id), ...VIEWS];
  const ids = a.stops ? String(a.stops).split(',').map((s) => s.trim()) : ['apertura', ...stops.map((s) => s.id), ...VIEWS.slice(1)];
  for (const id of ids) {
    if (!known.includes(id)) fail(`Tappa sconosciuta: "${id}". Valide: ${known.join(', ')}`);
  }
  return ids.map((id) => ({ label: id, query: { stop: id } }));
}

async function launchBrowser() {
  const flags = args.gpu
    ? ['--ignore-gpu-blocklist', '--enable-gpu'] // headless Chrome stays on SwiftShader without --enable-gpu
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const attempts = [];
  if (process.env.CHROME_PATH) attempts.push({ executablePath: process.env.CHROME_PATH });
  attempts.push({ channel: 'chrome' }); // the Google Chrome installed on this computer
  attempts.push({}); // Playwright's own Chromium (npx playwright install chromium)
  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, headless: !args.headed, args: flags });
    } catch (error) {
      lastError = error;
    }
  }
  fail(
    'Non trovo un browser da usare. Installa Google Chrome, oppure esegui una volta:\n' +
      '  npx playwright install chromium\n\n' +
      String(lastError),
  );
}

async function writeContactSheet(b, vpName, shots) {
  if (shots.length === 0) return;
  const thumb = vpName === 'phone' ? 180 : 340;
  const cells = shots
    .map((s) => {
      const src = path.relative(outDir, path.resolve(s.file)).split(path.sep).join('/');
      const badge = s.errors.length ? `<span class="err">${s.errors.length} errori</span>` : '';
      return `<figure><img src="${src}" width="${thumb}"><figcaption>${s.label} ${badge}</figcaption></figure>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:16px;background:#111;color:#ddd;font:13px system-ui,sans-serif}
    h1{font-size:16px;margin:0 0 12px}
    main{display:flex;flex-wrap:wrap;gap:12px}
    figure{margin:0;width:${thumb}px}
    img{display:block;width:100%;height:auto;border:1px solid #333}
    figcaption{margin-top:4px}
    .err{color:#ff6b6b;font-weight:600}
  </style><h1>Dieci · ${vpName} · ${shots.length} screenshot</h1><main>${cells}</main>`;
  const htmlPath = path.join(outDir, `contact-${vpName}.html`);
  fs.writeFileSync(htmlPath, html);
  const page = await b.newPage({ viewport: { width: 1480, height: 900 } });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForLoadState('load');
  await page.screenshot({ path: path.join(outDir, `contact-${vpName}.png`), fullPage: true });
  await page.close();
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(2);
}
