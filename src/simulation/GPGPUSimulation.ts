import * as THREE from 'three';
import { ParticleSimulationConfig, ShapeType, HandForceUniform } from '../types/simulation';
import { simulationVertexShader } from './shaders/simulationVertex.glsl';
import { simulationFragmentShader } from './shaders/simulationFragment.glsl';
import { generateShapeCoordinates } from '../math/shapes';
import { SHAPE_SEQUENCE } from '../config/palettes';

export class GPGPUSimulation {
  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;
  private count: number;

  // Render Targets (Ping-Pong pairs)
  private posTargetA: THREE.WebGLRenderTarget;
  private posTargetB: THREE.WebGLRenderTarget;
  private velTargetA: THREE.WebGLRenderTarget;
  private velTargetB: THREE.WebGLRenderTarget;

  // Cached Target Shape DataTextures
  private shapeTextures: Map<ShapeType, THREE.DataTexture> = new Map();

  // Morph state
  private currentShape: ShapeType = 'sun';
  private targetShape: ShapeType = 'sun';
  private morphProgress = 1.0;
  private morphDuration = 1.8; // seconds

  // Offscreen Compute Scene
  private computeScene: THREE.Scene;
  private computeCamera: THREE.OrthographicCamera;
  private computeQuad: THREE.Mesh;
  private posMaterial: THREE.ShaderMaterial;
  private velMaterial: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer, config: ParticleSimulationConfig) {
    this.renderer = renderer;
    this.width = config.textureWidth;
    this.height = config.textureHeight;
    this.count = config.particleCount;

    // Verify Float texture support
    const gl = renderer.getContext();
    if (!renderer.capabilities.isWebGL2 && !gl.getExtension('OES_texture_float')) {
      console.warn('Float textures may not be fully supported; falling back where available.');
    }

    // 1. Create Render Targets
    const targetOptions: THREE.RenderTargetOptions = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    };

    this.posTargetA = new THREE.WebGLRenderTarget(this.width, this.height, targetOptions);
    this.posTargetB = new THREE.WebGLRenderTarget(this.width, this.height, targetOptions);
    this.velTargetA = new THREE.WebGLRenderTarget(this.width, this.height, targetOptions);
    this.velTargetB = new THREE.WebGLRenderTarget(this.width, this.height, targetOptions);

    // 2. Pre-generate all Shape Target DataTextures
    this.precomputeShapes();

    // 3. Initialize Starting Positions & Velocities
    this.initializeBuffers();

    // 4. Setup Offscreen Compute Scene & Materials
    this.computeScene = new THREE.Scene();
    this.computeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const planeGeo = new THREE.PlaneGeometry(2, 2);

    const createUniforms = () => ({
      uCurrentPosition: { value: this.posTargetA.texture },
      uCurrentVelocity: { value: this.velTargetA.texture },
      uTargetPositionA: { value: this.shapeTextures.get(this.currentShape) },
      uTargetPositionB: { value: this.shapeTextures.get(this.targetShape) },
      uMorphProgress: { value: 1.0 },
      uDeltaTime: { value: 0.016 },
      uTime: { value: 0.0 },
      uReturnStrength: { value: config.returnStrength },
      uDamping: { value: config.damping },
      uCurlStrength: { value: config.curlNoiseStrength },
      uCurlFrequency: { value: config.curlNoiseFrequency },
      uMaxSpeed: { value: config.maxSpeed },
      uGlobalScale: { value: 1.0 },

      // Two hands
      uHandPos: { value: [new THREE.Vector3(), new THREE.Vector3()] },
      uHandVel: { value: [new THREE.Vector3(), new THREE.Vector3()] },
      uHandStrength: { value: [0.0, 0.0] },
      uHandRadius: { value: [6.0, 6.0] },
      uHandActive: { value: [0, 0] }
    });

    // Position Compute Material (Fast Position Integration Pass)
    this.posMaterial = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
      uniforms: createUniforms(),
      defines: { RENDER_POSITION: '' }
    });

    // Velocity Compute Material (Physics & Forces Pass)
    this.velMaterial = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
      uniforms: createUniforms(),
      defines: {}
    });

    this.computeQuad = new THREE.Mesh(planeGeo, this.posMaterial);
    this.computeQuad.frustumCulled = false;
    this.computeScene.add(this.computeQuad);
  }

  private precomputeShapes(): void {
    for (const shape of SHAPE_SEQUENCE) {
      const coords = generateShapeCoordinates(shape, this.count);
      const texture = new THREE.DataTexture(
        coords as any,
        this.width,
        this.height,
        THREE.RGBAFormat,
        THREE.FloatType
      );
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      this.shapeTextures.set(shape, texture);
    }
  }

  private initializeBuffers(): void {
    const initialPos = generateShapeCoordinates('sun', this.count);
    const initialVel = new Float32Array(this.count * 4);

    const posTex = new THREE.DataTexture(
      initialPos as any,
      this.width,
      this.height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    posTex.minFilter = THREE.NearestFilter;
    posTex.magFilter = THREE.NearestFilter;
    posTex.generateMipmaps = false;
    posTex.needsUpdate = true;

    const velTex = new THREE.DataTexture(
      initialVel as any,
      this.width,
      this.height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    velTex.minFilter = THREE.NearestFilter;
    velTex.magFilter = THREE.NearestFilter;
    velTex.generateMipmaps = false;
    velTex.needsUpdate = true;

    // Use RawShaderMaterial with toneMapped: false so raw float coordinates
    // are copied bit-for-bit with ZERO tonemapping or color-space clamping
    const copyScene = new THREE.Scene();
    const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const copyMat = new THREE.RawShaderMaterial({
      vertexShader: /* glsl */ `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D uTex;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(uTex, vUv);
        }
      `,
      uniforms: { uTex: { value: posTex } },
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const copyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
    copyScene.add(copyMesh);

    const oldTarget = this.renderer.getRenderTarget();

    // Seed Position Target A and B with true initial coordinates
    this.renderer.setRenderTarget(this.posTargetA);
    this.renderer.render(copyScene, copyCamera);
    this.renderer.setRenderTarget(this.posTargetB);
    this.renderer.render(copyScene, copyCamera);

    // Seed Velocity Target A and B with clean 0.0
    copyMat.uniforms.uTex.value = velTex;
    this.renderer.setRenderTarget(this.velTargetA);
    this.renderer.render(copyScene, copyCamera);
    this.renderer.setRenderTarget(this.velTargetB);
    this.renderer.render(copyScene, copyCamera);

    this.renderer.setRenderTarget(oldTarget);

    copyMesh.geometry.dispose();
    copyMat.dispose();
    posTex.dispose();
    velTex.dispose();
  }

  public morphTo(shape: ShapeType, duration = 1.8): void {
    if (this.targetShape === shape && this.morphProgress >= 1.0) return;

    this.currentShape = this.targetShape;
    this.targetShape = shape;
    this.morphProgress = 0.0;
    this.morphDuration = Math.max(duration, 0.4);

    const texA = this.shapeTextures.get(this.currentShape);
    const texB = this.shapeTextures.get(this.targetShape);

    this.posMaterial.uniforms.uTargetPositionA.value = texA;
    this.posMaterial.uniforms.uTargetPositionB.value = texB;
    this.velMaterial.uniforms.uTargetPositionA.value = texA;
    this.velMaterial.uniforms.uTargetPositionB.value = texB;
  }

  public update(
    dt: number,
    time: number,
    hands: HandForceUniform[],
    globalScale: number
  ): void {
    // 1. Advance Morph Progress
    if (this.morphProgress < 1.0) {
      this.morphProgress = Math.min(1.0, this.morphProgress + dt / this.morphDuration);
    }

    // 2. Sync Common Uniforms
    const mats = [this.posMaterial, this.velMaterial];
    for (const mat of mats) {
      mat.uniforms.uDeltaTime.value = dt;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uMorphProgress.value = this.morphProgress;
      mat.uniforms.uGlobalScale.value = globalScale;

      // Update hands
      for (let i = 0; i < 2; i++) {
        if (hands[i] && hands[i].active) {
          mat.uniforms.uHandPos.value[i].copy(hands[i].position);
          mat.uniforms.uHandVel.value[i].copy(hands[i].velocity);
          mat.uniforms.uHandStrength.value[i] = hands[i].strength;
          mat.uniforms.uHandRadius.value[i] = hands[i].radius;
          mat.uniforms.uHandActive.value[i] = 1;
        } else {
          mat.uniforms.uHandActive.value[i] = 0;
          mat.uniforms.uHandStrength.value[i] = 0;
        }
      }
    }

    const currentRenderTarget = this.renderer.getRenderTarget();

    // 3. Step A: Compute new Velocity into velTargetB
    this.velMaterial.uniforms.uCurrentPosition.value = this.posTargetA.texture;
    this.velMaterial.uniforms.uCurrentVelocity.value = this.velTargetA.texture;
    this.computeQuad.material = this.velMaterial;

    this.renderer.setRenderTarget(this.velTargetB);
    this.renderer.render(this.computeScene, this.computeCamera);

    // Swap velocity buffers
    const tempVel = this.velTargetA;
    this.velTargetA = this.velTargetB;
    this.velTargetB = tempVel;

    // 4. Step B: Compute new Position into posTargetB using newly updated velocity
    this.posMaterial.uniforms.uCurrentPosition.value = this.posTargetA.texture;
    this.posMaterial.uniforms.uCurrentVelocity.value = this.velTargetA.texture;
    this.computeQuad.material = this.posMaterial;

    this.renderer.setRenderTarget(this.posTargetB);
    this.renderer.render(this.computeScene, this.computeCamera);

    // Swap position buffers
    const tempPos = this.posTargetA;
    this.posTargetA = this.posTargetB;
    this.posTargetB = tempPos;

    // Restore render target
    this.renderer.setRenderTarget(currentRenderTarget);
  }

  public setPhysicsParams(params: { curlStrength?: number; returnStrength?: number }): void {
    const mats = [this.posMaterial, this.velMaterial];
    for (const mat of mats) {
      if (params.curlStrength !== undefined) {
        mat.uniforms.uCurlStrength.value = params.curlStrength;
      }
      if (params.returnStrength !== undefined) {
        mat.uniforms.uReturnStrength.value = params.returnStrength;
      }
    }
  }

  public getPositionTexture(): THREE.Texture {
    return this.posTargetA.texture;
  }

  public getVelocityTexture(): THREE.Texture {
    return this.velTargetA.texture;
  }

  public getCurrentShape(): ShapeType {
    return this.targetShape;
  }

  public getMorphProgress(): number {
    return this.morphProgress;
  }

  public dispose(): void {
    this.posTargetA.dispose();
    this.posTargetB.dispose();
    this.velTargetA.dispose();
    this.velTargetB.dispose();
    this.shapeTextures.forEach((tex) => tex.dispose());
    this.posMaterial.dispose();
    this.velMaterial.dispose();
    this.computeQuad.geometry.dispose();
  }
}
