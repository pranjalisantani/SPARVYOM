import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { POST_PROCESSING_DEFAULTS } from '../config/constants';

export class PostProcessingManager {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private renderPass: RenderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number
  ) {
    this.renderPass = new RenderPass(scene, camera);

    // High performance bloom pass with half resolution downsampling
    const bloomResolution = new THREE.Vector2(width, height);
    this.bloomPass = new UnrealBloomPass(
      bloomResolution,
      POST_PROCESSING_DEFAULTS.bloomStrength,
      POST_PROCESSING_DEFAULTS.bloomRadius,
      POST_PROCESSING_DEFAULTS.bloomThreshold
    );

    const outputPass = new OutputPass();

    // Create high-dynamic-range render target for WebGL2 float buffer support
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });

    this.composer = new EffectComposer(renderer, renderTarget);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(outputPass);
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  public setBloom(strength: number, radius: number, threshold: number): void {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    this.bloomPass.dispose();
    this.renderPass.dispose();
  }
}
