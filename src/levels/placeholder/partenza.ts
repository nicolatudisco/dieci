/**
 * Placeholder for `partenza`: one metre of a street in Rifredi at night, seen from above,
 * with her on the doorstep. The picture is in ../doorstep.ts, shared with the finale.
 *
 * Units: metres. Origin: «Tu sei qui», on her chest. +y is towards the door. The centre
 * track frames her whole (stage.ts, keyframe e = 0).
 */
import type { Level, LevelDef, LevelFrame } from '../../engine/level.ts';
import { Doorstep } from '../doorstep.ts';

class Partenza implements Level {
  private readonly picture = new Doorstep();
  readonly scene = this.picture.scene;

  init(): void {}

  update(frame: LevelFrame): void {
    this.picture.update(frame.fade, frame.pixelRatio, frame.time);
  }

  dispose(): void {
    this.picture.dispose();
  }
}

export default function createPartenza(_def: LevelDef): Level {
  return new Partenza();
}
