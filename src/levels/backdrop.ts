/**
 * The shared sky: faint stars behind every level, from the Earth onwards.
 *
 * They are not at any scale: they are the night. They drift slowly with the journey, so
 * that travelling is felt even where a scene is almost empty, and they are not there on
 * the ground (the first stops look down at a street) nor in Act II, where the black is total.
 */
import { PerspectiveCamera, Scene, type Points } from 'three';
import type { Backdrop, BackdropFrame } from '../engine/level.ts';
import { makeDots, mulberry32, sharedUniforms } from './placeholder/primitives.ts';

const STAR_COUNT = 1500;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How visible the sky is along the journey. */
export function skyOpacity(u: number, e: number): number {
  const fromTheGround = smoothstep(6.3, 7.4, e);
  const amongGalaxies = 1 - 0.4 * smoothstep(21, 24, e);
  const beyond = 1 - smoothstep(27.4, 29.2, u);
  return fromTheGround * amongGalaxies * beyond;
}

export class StarBackdrop implements Backdrop {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.1, 10);
  private readonly shared = sharedUniforms();
  private readonly stars: Points;

  constructor() {
    const random = mulberry32(1977);
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const colors = new Float32Array(STAR_COUNT * 3);
    const phases = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Uniform on a sphere around the camera.
      const z = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      positions[i * 3] = r * Math.cos(a);
      positions[i * 3 + 1] = r * Math.sin(a);
      positions[i * 3 + 2] = z;
      // Many faint ones, a few bright ones.
      const bright = random() ** 5;
      sizes[i] = 1.6 + 3.4 * bright;
      const level = 0.3 + 0.7 * bright + 0.15 * random();
      const warmth = random();
      colors[i * 3] = level * (0.78 + 0.22 * warmth);
      colors[i * 3 + 1] = level * (0.83 + 0.1 * warmth);
      colors[i * 3 + 2] = level;
      phases[i] = random();
    }
    this.stars = makeDots({ positions, sizes, colors, phases }, this.shared, 1);
    this.scene.add(this.stars);
  }

  update(frame: BackdropFrame): void {
    const aspect = frame.width / Math.max(1, frame.height);
    if (aspect !== this.camera.aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    const opacity = skyOpacity(frame.u, frame.e);
    this.stars.visible = opacity > 0.003;
    this.shared.uFade.value = opacity;
    this.shared.uPixelRatio.value = frame.pixelRatio;
    this.shared.uTime.value = frame.time;
    // The sky turns a few degrees for every power of ten travelled.
    this.stars.rotation.set(0.05 * frame.e, 0.085 * frame.e, 0);
    this.stars.geometry.setDrawRange(0, Math.max(1, Math.floor(STAR_COUNT * frame.quality)));
  }

  dispose(): void {
    this.stars.geometry.dispose();
    const material = this.stars.material;
    if (Array.isArray(material)) for (const m of material) m.dispose();
    else material.dispose();
  }
}
