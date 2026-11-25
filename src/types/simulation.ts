import * as THREE from 'three';

export type ShapeType =
  | 'sun'       // Fibonacci golden solar sphere (Ref: PDF p.4, 13, 16)
  | 'saturn'    // Core sphere + tilted annular ring system (Ref: PDF p.19, Video 0.0s)
  | 'galaxy'    // Multi-arm logarithmic spiral vortex (Ref: PDF p.11, 17, 21)
  | 'heart'     // Volumetric 3D cardioid constellation (Ref: PDF p.18, Video 7.0s, 13.5s)
  | 'wave'      // Harmonic corrugated standing wave sphere (Ref: PDF p.6, 9)
  | 'ribbon'    // Flowing digital silk / Mobius veil (Ref: PDF p.2, 3, 15)
  | 'nebula';   // Cosmic starfield / turbulent dye cloud (Ref: PDF p.20, Video 3.5s)

export interface ShapeDefinition {
  id: ShapeType;
  name: string;
  subtitle: string;
  palette: ShapePalette;
  description: string;
  defaultParticleSize: number;
}

export interface ShapePalette {
  primary: THREE.Color;
  secondary: THREE.Color;
  highlight: THREE.Color;
  core: THREE.Color;
}

export interface ParticleSimulationConfig {
  textureWidth: number;
  textureHeight: number;
  particleCount: number;
  maxSpeed: number;
  damping: number;
  returnStrength: number;
  curlNoiseFrequency: number;
  curlNoiseStrength: number;
}

export interface HandForceUniform {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  strength: number; // Positive = attract, negative = repulse
  radius: number;
  active: boolean;
}
