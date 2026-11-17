/**
 * The stop `partenza`: one metre of a street in Rifredi at night, seen from above, with her
 * on the doorstep. The picture is in doorstep.ts, shared with `strada` and with the finale.
 *
 * During the first zoom the picture turns gently until the door and the kerb lie as they do
 * on the real street (street.ts), together with `strada`.
 *
 * Units: metres. Origin: «Tu sei qui», on her chest. In the picture +y is towards the door.
 * The centre track frames her whole (stage.ts, keyframe e = 0).
 */
import type { Level, LevelDef, LevelFrame } from '../engine/level.ts';
import { Doorstep } from './doorstep.ts';
import { streetTurn } from './street.ts';

class Partenza implements Level {
  private readonly picture = new Doorstep();
  readonly scene = this.picture.scene;

  init(): void {}

  update(frame: LevelFrame): void {
    this.picture.update(frame.fade, frame.pixelRatio, frame.time);
    this.scene.rotation.z = streetTurn(frame.e);
  }

  dispose(): void {
    this.picture.dispose();
  }
}

export default function createPartenza(_def: LevelDef): Level {
  return new Partenza();
}
