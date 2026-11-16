/**
 * Who owns the screen along the journey axis: the opening, the interface of the journey,
 * the finale or the epilogue. Pure functions of the position `u`, so they can be tested
 * and so that every view fades with the movement instead of popping in.
 */
import { EPILOGUE, FINALE, INTRO, NODES } from '../engine/journey.ts';

function ramp(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** The last stop: past it the interface gives way to the finale. */
const lastStop = [...NODES].reverse().find((node) => node.stop) ?? FINALE;

/** The opening is there only before the journey starts: it leaves as soon as it does. */
export function introOpacity(u: number): number {
  return 1 - ramp(INTRO.u + 0.02, INTRO.u + 0.3, u);
}

/** Counter, caption and buttons: from the first stop to the last. */
export function interfaceOpacity(u: number): number {
  const leaving = lastStop.u + 0.35 * (FINALE.u - lastStop.u);
  return ramp(-0.55, -0.1, u) * (1 - ramp(leaving, leaving + 0.5, u));
}

export function finaleOpacity(u: number): number {
  const half = (EPILOGUE.u - FINALE.u) / 2;
  return ramp(FINALE.u - 0.7, FINALE.u - 0.1, u) * (1 - ramp(FINALE.u + 0.15, FINALE.u + half * 0.9, u));
}

export function epilogueOpacity(u: number): number {
  const half = (EPILOGUE.u - FINALE.u) / 2;
  return ramp(EPILOGUE.u - half * 0.9, EPILOGUE.u - 0.1, u);
}

export type ScreenOwner = 'intro' | 'journey' | 'finale' | 'epilogue';

/** Whose empty cell is the free area of the scene at position `u`. */
export function screenOwner(u: number): ScreenOwner {
  if (u < INTRO.u + 0.05) return 'intro';
  if (u < (lastStop.u + FINALE.u) / 2) return 'journey';
  return u < (FINALE.u + EPILOGUE.u) / 2 ? 'finale' : 'epilogue';
}
