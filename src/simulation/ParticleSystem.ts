import * as THREE from 'three';
import { ParticleSimulationConfig, ShapePalette } from '../types/simulation';
import { particleVertexShader } from './shaders/particleVertex.glsl';
import { particleFragmentShader } from './shaders/particleFragment.glsl';
import { SHAPE_DEFINITIONS } from '../config/palettes';

export class ParticleSystem {
  public mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  private currentPalette: ShapePalette;
  private targetPalette: ShapePalette;
  private paletteLerp = 1.0;

  constructor(config: ParticleSimulationConfig) {
    const { textureWidth, textureHeight, particleCount } = config;

    // 1. Generate Static Reference UV coordinates for sampling GPGPU textures
    const references = new Float32Array(particleCount * 2);
    for (let i = 0; i < particleCount; i++) {
      const x = (i % textureWidth) / textureWidth;
      const y = Math.floor(i / textureWidth) / textureHeight;
      references[i * 2] = x + 0.5 / textureWidth; // Center pixel sampling
      references[i * 2 + 1] = y + 0.5 / textureHeight;
    }

    this.geometry = new THREE.BufferGeometry();
    // In WebGL, positions are dynamically retrieved in vertex shader via aReference
    // But Three.js requires a position attribute for bounding sphere computation
    const dummyPositions = new Float32Array(particleCount * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(dummyPositions, 3));
    this.geometry.setAttribute('aReference', new THREE.BufferAttribute(references, 2));

    // Disable frustum culling since particles move dynamically inside world volume
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 25.0);

    const initialDef = SHAPE_DEFINITIONS.sun;
    this.currentPalette = { ...initialDef.palette };
    this.targetPalette = { ...initialDef.palette };

    // 2. Custom Particle Shader Material
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uColorPrimary: { value: new THREE.Color().copy(initialDef.palette.primary) },
        uColorSecondary: { value: new THREE.Color().copy(initialDef.palette.secondary) },
        uColorHighlight: { value: new THREE.Color().copy(initialDef.palette.highlight) },
        uColorCore: { value: new THREE.Color().copy(initialDef.palette.core) },
        uParticleBaseSize: { value: initialDef.defaultParticleSize },
        uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTime: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  public setPalette(newPalette: ShapePalette, particleSize: number): void {
    this.currentPalette = {
      primary: this.material.uniforms.uColorPrimary.value.clone(),
      secondary: this.material.uniforms.uColorSecondary.value.clone(),
      highlight: this.material.uniforms.uColorHighlight.value.clone(),
      core: this.material.uniforms.uColorCore.value.clone()
    };
    this.targetPalette = newPalette;
    this.paletteLerp = 0.0;
    this.material.uniforms.uParticleBaseSize.value = particleSize;
  }

  public update(
    posTexture: THREE.Texture,
    velTexture: THREE.Texture,
    dt: number,
    time: number
  ): void {
    this.material.uniforms.uPositionTexture.value = posTexture;
    this.material.uniforms.uVelocityTexture.value = velTexture;
    this.material.uniforms.uTime.value = time;

    // Smoothly interpolate colors across palette
    if (this.paletteLerp < 1.0) {
      this.paletteLerp = Math.min(1.0, this.paletteLerp + dt * 1.5);
      const t = this.paletteLerp;

      this.material.uniforms.uColorPrimary.value.lerpColors(this.currentPalette.primary, this.targetPalette.primary, t);
      this.material.uniforms.uColorSecondary.value.lerpColors(this.currentPalette.secondary, this.targetPalette.secondary, t);
      this.material.uniforms.uColorHighlight.value.lerpColors(this.currentPalette.highlight, this.targetPalette.highlight, t);
      this.material.uniforms.uColorCore.value.lerpColors(this.currentPalette.core, this.targetPalette.core, t);
    }
  }

  public setParticleSize(size: number): void {
    this.material.uniforms.uParticleBaseSize.value = size;
  }

  public setDpr(dpr: number): void {
    this.material.uniforms.uDpr.value = dpr;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
