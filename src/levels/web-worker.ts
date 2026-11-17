/**
 * Builds the cosmic web (src/cosmic-web.ts) off the main thread: about half a second of
 * arithmetic that must never cost the zoom a frame. One message in, one message out; the
 * arrays are transferred, not copied.
 */
import { buildWebData } from '../cosmic-web.ts';

const scope = self as unknown as {
  onmessage: (() => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = () => {
  const data = buildWebData();
  const transfer = [
    data.outline,
    data.laniakea.positions,
    data.laniakea.density,
    data.around.positions,
    data.around.density,
    data.web.positions,
    data.web.density,
    data.flows.points,
    data.flows.starts,
    data.flows.inside,
    data.texture.data,
  ].map((array) => array.buffer as ArrayBuffer);
  scope.postMessage(data, transfer);
};
