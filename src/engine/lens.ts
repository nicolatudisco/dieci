/**
 * The lens pass: draws the small scene of a lens into a render target and composites it
 * on the canvas as a disc, exactly where the interface draws the edge of the lens
 * (ui/lens.ts). See `LensSpec` in level.ts for the convention.
 */
import {
  AddEquation,
  Color,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { LensSpec } from './level.ts';

/** Side of the render target in device pixels: enough for the largest lens at 2×. */
const TARGET_SIZE = 384;
/** The night inside the lens: a little lighter than the sky, so the disc reads as glass. */
const BACKING = '#0b1024';

export interface LensPlacement {
  /** Centre of the lens and its radius, in CSS pixels from the top-left of the canvas. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly opacity: number;
}

export class LensPass {
  private target: WebGLRenderTarget | null = null;
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material = new ShaderMaterial({
    uniforms: { map: { value: null }, opacity: { value: 1 }, backing: { value: new Color(BACKING) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float opacity;
      uniform vec3 backing;
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float edge = fwidth(r) * 1.5;
        float mask = 1.0 - smoothstep(1.0 - edge, 1.0, r);
        // The target holds premultiplied colour over nothing: lay it on the backing disc.
        vec4 image = texture2D(map, vUv);
        vec3 color = backing * (1.0 - image.a) + image.rgb;
        // A soft darkening towards the rim, like a real glass.
        color *= 1.0 - 0.35 * smoothstep(0.72, 1.0, r);
        float alpha = 0.96 * mask * opacity;
        gl_FragColor = vec4(color * alpha, alpha);
        #include <colorspace_fragment>
      }`,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  private readonly quad = new Mesh(new PlaneGeometry(2, 2), this.material);

  constructor() {
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /** `width` and `height` are the size of the canvas in CSS pixels. */
  render(renderer: WebGLRenderer, spec: LensSpec, place: LensPlacement, width: number, height: number): void {
    this.target ??= new WebGLRenderTarget(TARGET_SIZE, TARGET_SIZE, { samples: 4, depthBuffer: true, colorSpace: SRGBColorSpace });

    const half = spec.fieldWidth / 2;
    const [cx, cy] = spec.centre ?? [0, 0];
    this.camera.left = cx - half;
    this.camera.right = cx + half;
    this.camera.top = cy + half;
    this.camera.bottom = cy - half;
    this.camera.updateProjectionMatrix();

    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);
    renderer.clear();
    renderer.render(spec.scene, this.camera);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(alpha);

    this.material.uniforms.map!.value = this.target.texture;
    this.material.uniforms.opacity!.value = place.opacity;
    const size = place.radius * 2;
    // WebGL viewports are measured from the bottom-left corner.
    renderer.setViewport(place.x - place.radius, height - place.y - place.radius, size, size);
    renderer.render(this.quadScene, this.quadCamera);
    renderer.setViewport(0, 0, width, height);
  }

  dispose(): void {
    this.target?.dispose();
    this.target = null;
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
