/**
 * Off-screen fading for levels that declare `fadeMode: 'offscreen'`.
 *
 * Opaque meshes cannot be faded material by material without sorting artefacts, so the
 * engine draws such a level into a render target and composites the finished image with
 * the opacity of the level. Used only while the level is actually fading.
 */
import {
  AddEquation,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';

export class OffscreenFader {
  private target: WebGLRenderTarget | null = null;
  private readonly size = new Vector2();
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material = new ShaderMaterial({
    uniforms: { map: { value: null }, opacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        // The target holds premultiplied colour.
        gl_FragColor = texture2D(map, vUv) * opacity;
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
    this.scene.add(this.quad);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, opacity: number): void {
    renderer.getDrawingBufferSize(this.size);
    if (!this.target || this.target.width !== this.size.x || this.target.height !== this.size.y) {
      this.target?.dispose();
      this.target = new WebGLRenderTarget(this.size.x, this.size.y, {
        samples: 4,
        depthBuffer: true,
        colorSpace: SRGBColorSpace,
      });
    }
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(alpha);

    this.material.uniforms.map!.value = this.target.texture;
    this.material.uniforms.opacity!.value = opacity;
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target?.dispose();
    this.target = null;
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
