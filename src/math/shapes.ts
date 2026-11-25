import * as THREE from 'three';
import { ShapeType } from '../types/simulation';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function generateSunCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const coreCount = Math.floor(count * 0.35);
  const shellCount = count - coreCount;

  // 1. Radiant dense core (volumetric Gaussian sphere)
  for (let i = 0; i < coreCount; i++) {
    const idx = i * 4;
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    // Gaussian falloff for dense center
    const r = 2.8 * Math.pow(Math.random(), 2.2);

    data[idx] = r * Math.sin(phi) * Math.cos(theta);
    data[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    data[idx + 2] = r * Math.cos(phi);
    data[idx + 3] = 0.0; // Core indicator
  }

  // 2. Uniform Fibonacci spherical shell
  for (let i = 0; i < shellCount; i++) {
    const idx = (coreCount + i) * 4;
    const y = 1 - (i / (shellCount - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;

    const baseRadius = 5.2;
    // Corona flare perturbation
    const flare = Math.sin(i * 0.3) * 0.25;
    const r = baseRadius + flare;

    data[idx] = Math.cos(theta) * radiusAtY * r;
    data[idx + 1] = y * r;
    data[idx + 2] = Math.sin(theta) * radiusAtY * r;
    data[idx + 3] = 1.0; // Shell indicator
  }

  return data;
}

export function generateSaturnCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const planetCount = Math.floor(count * 0.30);
  const ringCount = count - planetCount;

  // Planet tilt: 26.7 degrees along X/Z axis
  const tiltEuler = new THREE.Euler(0.466, 0.2, 0.35);
  const tiltMatrix = new THREE.Matrix4().makeRotationFromEuler(tiltEuler);
  const tempVec = new THREE.Vector3();

  // 1. Planet Sphere
  for (let i = 0; i < planetCount; i++) {
    const idx = i * 4;
    const y = 1 - (i / (planetCount - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    const r = 3.2;

    tempVec.set(
      Math.cos(theta) * radiusAtY * r,
      y * r * 0.92, // Slight oblate oblateness
      Math.sin(theta) * radiusAtY * r
    );
    tempVec.applyMatrix4(tiltMatrix);

    data[idx] = tempVec.x;
    data[idx + 1] = tempVec.y;
    data[idx + 2] = tempVec.z;
    data[idx + 3] = 0.0; // Planet core
  }

  // 2. Concentric Tilted Rings
  const rMin = 4.2;
  const rMax = 9.8;
  const cassiniDivisionMin = 6.2;
  const cassiniDivisionMax = 6.8;

  for (let i = 0; i < ringCount; i++) {
    const idx = (planetCount + i) * 4;
    let ringRadius = rMin + Math.pow(Math.random(), 0.8) * (rMax - rMin);

    // Rejection sample to create authentic Cassini division gap
    if (ringRadius > cassiniDivisionMin && ringRadius < cassiniDivisionMax && Math.random() < 0.88) {
      ringRadius = (Math.random() < 0.5) ? rMin + Math.random() * (cassiniDivisionMin - rMin) : cassiniDivisionMax + Math.random() * (rMax - cassiniDivisionMax);
    }

    const theta = Math.random() * Math.PI * 2.0;
    const zOffset = (Math.random() - 0.5) * 0.12; // Flat disc with minute thickness

    tempVec.set(
      Math.cos(theta) * ringRadius,
      zOffset,
      Math.sin(theta) * ringRadius
    );
    tempVec.applyMatrix4(tiltMatrix);

    data[idx] = tempVec.x;
    data[idx + 1] = tempVec.y;
    data[idx + 2] = tempVec.z;
    data[idx + 3] = 1.0; // Ring indicator
  }

  return data;
}

export function generateGalaxyCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const arms = 4;
  const armCoeff = 0.32; // Tightness of spiral logarithmic curve
  const rMax = 8.5;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    const armIndex = i % arms;
    const armOffset = (armIndex * 2 * Math.PI) / arms;

    // Concentrated towards galactic bulge
    const r = Math.pow(Math.random(), 1.6) * rMax + 0.3;
    const spiralAngle = Math.log(r / 0.5) / armCoeff + armOffset;

    // Spread increases with radius
    const dispersion = (Math.random() - 0.5) * (0.35 + r * 0.15);
    const theta = spiralAngle + dispersion;

    // Height decreases exponentially from core
    const zHeight = (Math.random() - 0.5) * Math.exp(-r / 3.0) * 1.8;

    data[idx] = Math.cos(theta) * r;
    data[idx + 1] = zHeight;
    data[idx + 2] = Math.sin(theta) * r;
    data[idx + 3] = r / rMax; // Normalized radial distance for color ramp
  }

  return data;
}

export function generateHeartCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  let accepted = 0;

  // Rejection sampling using Taubin's 3D implicit algebraic heart surface:
  // (x^2 + (9/4)y^2 + z^2 - 1)^3 - x^2 * z^3 - (9/80)y^2 * z^3 <= 0
  const scale = 3.6;

  while (accepted < count) {
    // Generate uniform random candidate in bounding cube [-1.5, 1.5]
    const x = (Math.random() * 3.0 - 1.5);
    const y = (Math.random() * 3.0 - 1.5);
    const z = (Math.random() * 3.0 - 1.5);

    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    const z3 = z2 * z;

    const term = x2 + 2.25 * y2 + z2 - 1.0;
    const val = term * term * term - x2 * z3 - 0.1125 * y2 * z3;

    if (val <= 0.05) { // Inside or near surface
      const idx = accepted * 4;
      // Orient heart upright: Taubin uses Y as depth, Z as vertical
      data[idx] = x * scale;
      data[idx + 1] = z * scale * 1.1; // Upward axis
      data[idx + 2] = y * scale * 0.8;
      data[idx + 3] = accepted / count;
      accepted++;
    }
  }

  return data;
}

export function generateWaveSphereCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const baseRadius = 5.0;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    const phi = Math.acos(y);

    // Harmonic wave standing deformation: 6 longitudinal waves, 4 latitudinal waves
    const harmonic = Math.sin(6.0 * theta) * Math.cos(4.0 * phi) * 0.95;
    const r = baseRadius + harmonic;

    data[idx] = Math.cos(theta) * radiusAtY * r;
    data[idx + 1] = y * r;
    data[idx + 2] = Math.sin(theta) * radiusAtY * r;
    data[idx + 3] = harmonic; // Harmonic height for shader color modulation
  }

  return data;
}

export function generateRibbonCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const length = 12.0;
  const width = 4.0;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    const u = (i / count) * 2.0 - 1.0; // -1 to 1 along ribbon length
    const v = (Math.random() * 2.0 - 1.0); // -1 to 1 along ribbon width

    const x = u * (length * 0.5);
    // Double sine wave undulating crests
    const y = Math.sin(u * Math.PI * 2.5) * 2.2 + Math.cos(v * Math.PI) * 0.8;
    const z = v * (width * 0.5) + Math.cos(u * Math.PI * 2.0) * 1.5;

    data[idx] = x;
    data[idx + 1] = y;
    data[idx + 2] = z;
    data[idx + 3] = (u + 1.0) * 0.5; // Normalized position along ribbon
  }

  return data;
}

export function generateNebulaCoordinates(count: number): Float32Array {
  const data = new Float32Array(count * 4);
  const radius = 9.0;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    // Multi-cluster cosmic starfield
    const cluster = i % 3;
    let cx = 0, cy = 0, cz = 0;
    if (cluster === 1) { cx = 3.5; cy = 1.5; cz = -2.0; }
    else if (cluster === 2) { cx = -3.0; cy = -2.0; cz = 2.5; }

    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.pow(Math.random(), 0.7) * (radius * 0.6);

    data[idx] = cx + r * Math.sin(phi) * Math.cos(theta);
    data[idx + 1] = cy + r * Math.sin(phi) * Math.sin(theta);
    data[idx + 2] = cz + r * Math.cos(phi);
    data[idx + 3] = Math.random();
  }

  return data;
}

export function generateShapeCoordinates(type: ShapeType, count: number): Float32Array {
  switch (type) {
    case 'sun':
      return generateSunCoordinates(count);
    case 'saturn':
      return generateSaturnCoordinates(count);
    case 'galaxy':
      return generateGalaxyCoordinates(count);
    case 'heart':
      return generateHeartCoordinates(count);
    case 'wave':
      return generateWaveSphereCoordinates(count);
    case 'ribbon':
      return generateRibbonCoordinates(count);
    case 'nebula':
      return generateNebulaCoordinates(count);
    default:
      return generateSunCoordinates(count);
  }
}
