/**
 * Her disc as a PNG she can keep: upright, under a still light, on the night of the site,
 * 2048 pixels a side. It is made in the browser and saved on the device with an ordinary
 * download (on the iPad, Safari asks and puts it in File → Download). Nothing is sent
 * anywhere.
 */
import type { DiscDesign } from './design.ts';
import { HERS, composeHers, drawLights, fontsReady, paintHerLayers, paintLights, radiusFor } from './paint.ts';

export const PNG_SIZE = 2048;
export const PNG_NAME = 'disco-d-oro.png';

/** The picture of her disc on a canvas of `size` pixels. */
export function discCanvas(design: DiscDesign, size = PNG_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  const c = size / 2;
  g.fillStyle = '#05060d';
  g.fillRect(0, 0, size, size);
  // The warm light the disc gives off, as on the page.
  const glow = g.createRadialGradient(c, c, size * 0.36, c, c, size * 0.5);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.2)');
  glow.addColorStop(0.35, 'rgba(255, 180, 80, 0.07)');
  glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  const disc = Math.round(size * 0.86);
  g.translate(c, c);
  composeHers(g, disc, paintHerLayers(disc, design));
  const lights = paintLights(g);
  if (lights) drawLights(g, lights, radiusFor(disc), HERS.label, disc);
  return canvas;
}

/** The PNG of her disc. */
export async function discPng(design: DiscDesign, size = PNG_SIZE): Promise<Blob | null> {
  await fontsReady();
  const canvas = discCanvas(design, size);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Saves a file on the device: an ordinary download. */
export function download(blob: Blob, name = PNG_NAME): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari may still be reading it a moment later.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
