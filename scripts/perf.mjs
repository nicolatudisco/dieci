#!/usr/bin/env node
/**
 * How smoothly the journey runs on a phone and on a tablet: the whole journey with ▶ alone,
 * on the real GPU, with the processor slowed down four times (as on a phone), measuring
 * every frame while travelling to each stop and while resting on it.
 *
 * Usage, from the project root:
 *   npm run perf                       phone (390 × 844, density 3) and iPad (1180 × 820, density 2)
 *   npm run perf -- --viewports phone  only one
 *   npm run perf -- --cpu 1            the processor at full speed
 *   npm run perf -- --rest 3000        milliseconds measured on each stop (default 2000)
 *
 * For each stop: frame times while travelling to it and while resting on it (median and
 * 95th percentile, in ms), the frames over the budget by more than a quarter (phone 33 ms,
 * tablet 16.7 ms), and
 * the step of the adaptive quality the engine had reached (0 = full quality).
 *
 * The GPU of this computer is stronger than a phone's: a stop that is tight here will be
 * slow on a real phone. The test on a real device is still the one that counts.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const VIEWPORTS = {
  phone: { context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, budget: 1000 / 30 },
  ipad: { context: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, budget: 1000 / 60 },
};
const names = option('viewports', 'phone,ipad').split(',');
const cpu = Number(option('cpu', '4'));
const rest = Number(option('rest', '2000'));

const percentile = (values, p) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const vite = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 5197, strictPort: false } });
let browser;
try {
  const { STOPS } = await vite.ssrLoadModule('/src/content/levels.ts');
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/?$/, '/');
  browser = await chromium.launch({ channel: 'chrome', args: ['--ignore-gpu-blocklist', '--enable-gpu'] }).catch(() => chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu'] }));

  for (const name of names) {
    const vp = VIEWPORTS[name];
    if (!vp) throw new Error(`Viewport sconosciuto: ${name}`);
    const context = await browser.newContext(vp.context);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    // Every frame of the page, with the time it took.
    await page.addInitScript(() => {
      window.__frames = [];
      let last = 0;
      const tick = (time) => {
        if (last) window.__frames.push(time - last);
        last = time;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${base}?stop=partenza&debug=1`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 60000 });

    const take = () => page.evaluate(() => window.__frames.splice(0));
    const quality = () => page.evaluate(() => /quality (\d+)/.exec(document.querySelector('.debug')?.textContent ?? '')?.[1] ?? '?');
    const rows = [];
    await page.waitForTimeout(1500);
    await take();
    for (const [index, stop] of STOPS.entries()) {
      let travel = [];
      if (index > 0) {
        await page.click('.nav-button--forward');
        await page.waitForFunction((id) => document.documentElement.dataset.at === id, stop.id, { timeout: 30000 }).catch(() => undefined);
        travel = await take();
      }
      await page.waitForTimeout(rest);
      const still = await take();
      // Slow is over a quarter more than the budget: 16.8 ms at 60 Hz is only the jitter of the clock.
      const over = [...travel, ...still].filter((ms) => ms > vp.budget * 1.25).length;
      rows.push({
        stop: stop.id,
        'travel med': +percentile(travel, 50).toFixed(1),
        'travel p95': +percentile(travel, 95).toFixed(1),
        'rest med': +percentile(still, 50).toFixed(1),
        'rest p95': +percentile(still, 95).toFixed(1),
        'over budget': over,
        quality: await quality(),
      });
    }
    console.log(`\n${name}: ${vp.context.viewport.width} × ${vp.context.viewport.height}, density ${vp.context.deviceScaleFactor}, CPU ×${cpu}, budget ${vp.budget.toFixed(1)} ms`);
    console.table(rows);
    const tight = rows.filter((row) => row['rest p95'] > vp.budget * 1.25 || row['travel p95'] > vp.budget * 1.5);
    console.log(tight.length ? `Sopra il budget: ${tight.map((row) => row.stop).join(', ')}` : 'Tutte le tappe nel budget.');
    if (errors.length) console.log(`Errori: ${errors.slice(0, 3).join(' | ')}`);
    await context.close();
  }
} finally {
  await browser?.close();
  await vite.close();
}
