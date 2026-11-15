/**
 * The URL contract (see CLAUDE.md). Used by tests and by scripts/screenshot.mjs.
 *
 *   ?stop=<id>   start at that stop, or at a view: apertura, finale, epilogo, fonti, disco
 *   ?u=<pos>     start at that position of the journey axis (reaches Act II transitions)
 *   ?s=<e>       start at that exponent, Act I only (0..26.94)
 *   ?static=1    freeze time, skip the opening (except ?stop=apertura), show final states
 *   ?debug=1     overlay with fps, position, active levels, draw calls
 *
 * Precedence: stop, then u, then s. Unknown or malformed values are ignored.
 */
import {
  E_MAX,
  E_MIN,
  EPILOGUE,
  FIRST_STOP,
  INTRO,
  U_MAX,
  U_MIN,
  clamp,
  isOverlayId,
  nodeById,
  type OverlayId,
} from './engine/journey.ts';

export interface Route {
  /** Where the journey starts. */
  readonly u: number;
  /** A view opened on top of the journey at start-up. */
  readonly overlay: OverlayId | null;
  readonly isStatic: boolean;
  readonly debug: boolean;
}

/** The stop that sits under each overlay when the page opens directly on it. */
const OVERLAY_BACKDROP: Record<OverlayId, string> = { disco: 'voyager', fonti: 'epilogo' };

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function parseRoute(search: string): Route {
  const params = new URLSearchParams(search);
  const isStatic = params.get('static') === '1';
  const debug = params.get('debug') === '1';
  const fallback = isStatic ? FIRST_STOP.u : INTRO.u;

  const stop = params.get('stop');
  if (stop) {
    if (isOverlayId(stop)) {
      const under = nodeById(OVERLAY_BACKDROP[stop]) ?? EPILOGUE;
      return { u: under.u, overlay: stop, isStatic, debug };
    }
    const node = nodeById(stop);
    if (node) return { u: node.u, overlay: null, isStatic, debug };
  }

  const u = parseNumber(params.get('u'));
  if (u !== null) return { u: clamp(u, U_MIN, U_MAX), overlay: null, isStatic, debug };

  const s = parseNumber(params.get('s'));
  if (s !== null) return { u: clamp(s, E_MIN, E_MAX), overlay: null, isStatic, debug };

  return { u: fallback, overlay: null, isStatic, debug };
}
