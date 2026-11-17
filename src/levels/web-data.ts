/**
 * The cosmic web, built once and shared by `laniakea`, `rete-cosmica` and `universo`: the same
 * galaxies at every scale. The first level that asks starts the worker; the others wait for the
 * same answer. It stays in memory (a few megabytes) for the rest of the visit.
 */
import type { WebData } from '../cosmic-web.ts';

let pending: Promise<WebData> | null = null;

function onThisThread(): Promise<WebData> {
  return import('../cosmic-web.ts').then((m) => m.buildWebData());
}

export function webData(): Promise<WebData> {
  pending ??= new Promise<WebData>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      void onThisThread().then(resolve);
      return;
    }
    worker.onmessage = (event: MessageEvent<WebData>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = () => {
      worker.terminate();
      void onThisThread().then(resolve);
    };
    worker.postMessage(null);
  });
  return pending;
}
