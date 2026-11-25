import * as THREE from 'three';
import { ShapeDefinition, ShapeType } from '../types/simulation';

/**
 * Blue Direction Palette (Figma Reference):
 * - Canvas Background: Deep Navy #06111D
 * - Active Feedback:   Ice Cyan #5CD9FF
 * - Distant Particles: Blue #2C719B
 * - Highlights:        Pale Cyan #C4F4FF
 * - Core Base:         Deep Luminous Navy #0F3B59
 */
export const SHAPE_DEFINITIONS: Record<ShapeType, ShapeDefinition> = {
  sun: {
    id: 'sun',
    name: 'Solar Sun',
    subtitle: 'Fibonacci Stellar Core',
    description: 'High-density uniform spherical star with radiant core bloom and subtle corona dust.',
    defaultParticleSize: 1.8,
    palette: {
      primary: new THREE.Color('#5CD9FF'),   // Ice cyan
      secondary: new THREE.Color('#2C719B'), // Blue distant particles
      highlight: new THREE.Color('#C4F4FF'), // Pale cyan highlights
      core: new THREE.Color('#0F3B59')      // Deep navy core
    }
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn & Rings',
    subtitle: 'Planetary Annular Disc',
    description: 'Central planetary sphere encircled by a concentric planar ring system tilted in 3D space.',
    defaultParticleSize: 1.6,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#2C719B'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#1B4965')
    }
  },
  galaxy: {
    id: 'galaxy',
    name: 'Spiral Galaxy',
    subtitle: 'Logarithmic Cosmic Vortex',
    description: 'Multi-arm swirling galaxy with differential rotation, filamentary ridges, and a central singularity.',
    defaultParticleSize: 1.5,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#3A86FF'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#0A2540')
    }
  },
  heart: {
    id: 'heart',
    name: 'Cosmic Heart',
    subtitle: 'Volumetric 3D Constellation',
    description: 'Parametric 3D cardioid manifold surrounded by sparkling ethereal particle dust.',
    defaultParticleSize: 1.6,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#64DFDF'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#2C719B')
    }
  },
  wave: {
    id: 'wave',
    name: 'Harmonic Sphere',
    subtitle: 'Sinusoidal Standing Waves',
    description: 'Spherical lattice modulated by stationary spherical harmonics and dynamic wave crests.',
    defaultParticleSize: 1.5,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#2C719B'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#0F3B59')
    }
  },
  ribbon: {
    id: 'ribbon',
    name: 'Digital Silk',
    subtitle: 'Flowing Veil Manifold',
    description: 'Continuous undulating ribbon veil with shallow depth-of-field and curl-noise streamlines.',
    defaultParticleSize: 1.5,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#48CAE4'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#023E8A')
    }
  },
  nebula: {
    id: 'nebula',
    name: 'Cosmic Nebula',
    subtitle: 'Freeform Starfield',
    description: 'Dispersed open universe with Brownian turbulence and deep galactic gas clouds.',
    defaultParticleSize: 1.4,
    palette: {
      primary: new THREE.Color('#5CD9FF'),
      secondary: new THREE.Color('#2C719B'),
      highlight: new THREE.Color('#C4F4FF'),
      core: new THREE.Color('#03045E')
    }
  }
};

export const SHAPE_SEQUENCE: ShapeType[] = ['sun', 'saturn', 'galaxy', 'heart', 'wave', 'ribbon', 'nebula'];
