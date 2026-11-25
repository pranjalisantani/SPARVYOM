import * as THREE from 'three';
import { GPGPUSimulation } from '../simulation/GPGPUSimulation';
import { ParticleSystem } from '../simulation/ParticleSystem';
import { PostProcessingManager } from './PostProcessing';
import { DEFAULT_SIM_CONFIG, INTERACTION_PARAMS, POST_PROCESSING_DEFAULTS } from '../config/constants';
import { HandData, InteractionMode } from '../types/gestures';
import { HandForceUniform, ShapeType } from '../types/simulation';
import { SHAPE_DEFINITIONS } from '../config/palettes';
import { SoundManager } from '../audio/SoundManager';

export class SceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private postProcessing: PostProcessingManager;
  private gpgpu: GPGPUSimulation;
  private particleSystem: ParticleSystem;
  private soundManager: SoundManager;

  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Mouse emulation state (fallback when camera is not used)
  private mousePos = new THREE.Vector2(0, 0);
  private mouseWorld = new THREE.Vector3(0, 0, 0);
  private isMouseDown = false;
  private mouseVelocity = new THREE.Vector3(0, 0, 0);
  private lastMouseWorld = new THREE.Vector3(0, 0, 0);
  private isMouseActive = false;

  // External tracked hands
  private activeHands: HandData[] = [];
  private currentMode: InteractionMode = 'idle';
  private globalScale = 1.0;

  // Camera parallax
  private targetCameraPos = new THREE.Vector3(0, 0, 18);
  private currentCameraPos = new THREE.Vector3(0, 0, 18);

  // Performance telemetry
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private fps = 60;
  private onFpsUpdate?: (fps: number) => void;

  // Kinetic shockwave impulse
  private shockwaveTimer = 0;

  // Temporary diagnostic modes: 'normal' | 'cube' | 'static_particles' | 'direct_gpgpu'
  public diagnosticMode: 'normal' | 'cube' | 'static_particles' | 'direct_gpgpu' = 'normal';
  private testCube: THREE.Mesh;

  constructor(container: HTMLElement, soundManager: SoundManager) {
    this.container = container;
    this.soundManager = soundManager;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. WebGL2 Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = POST_PROCESSING_DEFAULTS.toneMappingExposure;
    this.renderer.setClearColor(0x06111D, 1.0);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Perspective Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 18);

    // 3. Post-Processing Pipeline
    this.postProcessing = new PostProcessingManager(
      this.renderer,
      this.scene,
      this.camera,
      width,
      height
    );

    // 4. GPGPU Simulation & Particle System
    this.gpgpu = new GPGPUSimulation(this.renderer, DEFAULT_SIM_CONFIG);
    this.particleSystem = new ParticleSystem(DEFAULT_SIM_CONFIG);
    this.scene.add(this.particleSystem.mesh);

    // Diagnostic test object
    this.testCube = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    );
    this.testCube.visible = false;
    this.scene.add(this.testCube);

    // 5. Setup Window Listeners & Mouse Emulation
    this.setupEventListeners();

    // 6. Start Render Loop
    this.clock.start();
    this.animate();

    // Development diagnostic hook
    (window as any).__sceneManager = this;
    (window as any).__gpgpu = this.gpgpu;
    (window as any).__particleSystem = this.particleSystem;
    (window as any).__renderer = this.renderer;
    (window as any).__scene = this.scene;
    (window as any).__camera = this.camera;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onWindowResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.postProcessing.setSize(width, height);
    this.particleSystem.setDpr(Math.min(window.devicePixelRatio || 1, 2));
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.isMouseActive = true;

    // Project mouse coordinate into 3D world space at z = 0
    const vec = new THREE.Vector3(this.mousePos.x, this.mousePos.y, 0.5);
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / vec.z;
    this.mouseWorld.copy(this.camera.position).add(vec.multiplyScalar(distance));

    // Subtle camera parallax
    this.targetCameraPos.x = this.mousePos.x * 1.5;
    this.targetCameraPos.y = this.mousePos.y * 1.0;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isMouseDown = true;
    }
  };

  private onMouseUp = (): void => {
    this.isMouseDown = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    this.globalScale = Math.min(2.5, Math.max(0.4, this.globalScale + delta));
  };

  public setHandTrackingData(hands: HandData[], mode: InteractionMode, scale: number): void {
    this.activeHands = hands;
    this.currentMode = mode;
    this.globalScale = scale;
  }

  public morphToShape(shape: ShapeType): void {
    const def = SHAPE_DEFINITIONS[shape];
    if (def) {
      this.gpgpu.morphTo(shape, 1.8);
      this.particleSystem.setPalette(def.palette, def.defaultParticleSize);
      this.soundManager.playMorphChime();

      // Dynamically theme UI root CSS variables to match active universe
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', `#${def.palette.primary.getHexString()}`);
        root.style.setProperty('--theme-secondary', `#${def.palette.secondary.getHexString()}`);
        root.style.setProperty('--theme-highlight', `#${def.palette.highlight.getHexString()}`);
        root.style.setProperty('--theme-glow', `rgba(${Math.round(def.palette.primary.r * 255)}, ${Math.round(def.palette.primary.g * 255)}, ${Math.round(def.palette.primary.b * 255)}, 0.35)`);
      }
    }
  }

  public updateTuning(params: {
    curlStrength?: number;
    returnStrength?: number;
    particleSize?: number;
    bloomStrength?: number;
    globalScale?: number;
  }): void {
    if (params.curlStrength !== undefined || params.returnStrength !== undefined) {
      this.gpgpu.setPhysicsParams({
        curlStrength: params.curlStrength,
        returnStrength: params.returnStrength
      });
    }
    if (params.particleSize !== undefined) {
      this.particleSystem.setParticleSize(params.particleSize);
    }
    if (params.bloomStrength !== undefined) {
      this.postProcessing.setBloom(
        params.bloomStrength,
        POST_PROCESSING_DEFAULTS.bloomRadius,
        POST_PROCESSING_DEFAULTS.bloomThreshold
      );
    }
    if (params.globalScale !== undefined) {
      this.globalScale = params.globalScale;
    }
  }

  public triggerShockwave(): void {
    this.shockwaveTimer = 0.8;
    this.soundManager.playBurst();
  }

  public setOnFpsUpdate(cb: (fps: number) => void): void {
    this.onFpsUpdate = cb;
  }

  private prepareHandUniforms(dt: number): HandForceUniform[] {
    const handUniforms: HandForceUniform[] = [
      { position: new THREE.Vector3(), velocity: new THREE.Vector3(), strength: 0, radius: 6.0, active: false },
      { position: new THREE.Vector3(), velocity: new THREE.Vector3(), strength: 0, radius: 6.0, active: false }
    ];

    if (this.activeHands.length > 0) {
      // Use live MediaPipe Hand Tracking
      for (let i = 0; i < Math.min(this.activeHands.length, 2); i++) {
        const h = this.activeHands[i];
        let strength = 0;
        let position = h.palmCenter;

        if (h.isPinching || h.gesture === 'pinch') {
          strength = INTERACTION_PARAMS.attractorStrength;
          position = h.pinchMidpoint;
        } else if (h.isFist || h.gesture === 'fist' || this.currentMode === 'attract') {
          strength = INTERACTION_PARAMS.attractorStrength;
          position = h.palmCenter;
        } else if (h.isOpenPalm || h.gesture === 'open_palm' || this.currentMode === 'repel') {
          strength = INTERACTION_PARAMS.repulsorStrength;
          position = h.palmCenter;
        } else {
          // Release: no force field, allowing particles to return smoothly to formation
          strength = 0.0;
        }

        handUniforms[i] = {
          position,
          velocity: h.velocity,
          strength,
          radius: 7.5,
          active: strength !== 0.0
        };
      }
    } else if (this.isMouseActive) {
      // Fallback Mouse Emulation
      const dtClamp = Math.max(dt, 0.001);
      this.mouseVelocity.copy(this.mouseWorld).sub(this.lastMouseWorld).divideScalar(dtClamp);
      this.lastMouseWorld.copy(this.mouseWorld);

      let strength = 0;
      if (this.isMouseDown) {
        strength = INTERACTION_PARAMS.attractorStrength;
      } else {
        strength = INTERACTION_PARAMS.repulsorStrength * 0.4;
      }

      handUniforms[0] = {
        position: this.mouseWorld,
        velocity: this.mouseVelocity,
        strength,
        radius: 6.0,
        active: true
      };
    }

    // Apply kinetic shockwave burst if triggered
    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer = Math.max(0, this.shockwaveTimer - dt);
      const shockStrength = -180.0 * (this.shockwaveTimer / 0.8);
      handUniforms[1] = {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        strength: shockStrength,
        radius: 22.0,
        active: true
      };
    }

    return handUniforms;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    // 1. Calculate FPS
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.5) {
      this.fps = Math.round((this.frameCount / (time - this.lastFpsUpdate)));
      this.frameCount = 0;
      this.lastFpsUpdate = time;
      this.onFpsUpdate?.(this.fps);
    }

    // 2. Smooth Camera Parallax Motion
    this.currentCameraPos.lerp(this.targetCameraPos, dt * 2.5);
    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(0, 0, 0);

    // Diagnostic mode execution
    if (this.diagnosticMode === 'cube') {
      this.testCube.visible = true;
      this.particleSystem.mesh.visible = false;
      this.testCube.rotation.x += 0.01;
      this.testCube.rotation.y += 0.02;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.diagnosticMode === 'static_particles') {
      this.testCube.visible = false;
      this.particleSystem.mesh.visible = true;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.diagnosticMode === 'direct_gpgpu') {
      this.testCube.visible = false;
      this.particleSystem.mesh.visible = true;
      const handUniforms = this.prepareHandUniforms(dt);
      this.gpgpu.update(dt, time, handUniforms, this.globalScale);
      const posTex = this.gpgpu.getPositionTexture();
      const velTex = this.gpgpu.getVelocityTexture();
      this.particleSystem.update(posTex, velTex, dt, time);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.testCube.visible = false;
    this.particleSystem.mesh.visible = true;

    // 3. Prepare Hand Force Fields & Update GPGPU Compute Pass
    const handUniforms = this.prepareHandUniforms(dt);
    this.gpgpu.update(dt, time, handUniforms, this.globalScale);

    // 4. Update Render Material with new GPGPU Position & Velocity Textures
    const posTex = this.gpgpu.getPositionTexture();
    const velTex = this.gpgpu.getVelocityTexture();
    this.particleSystem.update(posTex, velTex, dt, time);

    // 5. Modulate Ambient Audio Synth
    const avgSpeed = (handUniforms[0].velocity.length() + handUniforms[1].velocity.length()) * 0.5;
    this.soundManager.updateModulation(avgSpeed, this.globalScale);

    // 6. Post-Processing Multi-Pass Render (Bloom + ACESFilmic Tone Mapping with Fallback)
    try {
      this.postProcessing.render();
    } catch {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);

    this.gpgpu.dispose();
    this.particleSystem.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
