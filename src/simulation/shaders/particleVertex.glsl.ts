export const particleVertexShader = /* glsl */ `
precision highp float;

uniform sampler2D uPositionTexture;
uniform sampler2D uVelocityTexture;

uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform vec3 uColorHighlight;
uniform vec3 uColorCore;

uniform float uParticleBaseSize;
uniform float uDpr;
uniform float uTime;

attribute vec2 aReference; // UV coordinates (u, v) into GPGPU textures

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 posData = texture2D(uPositionTexture, aReference);
  vec4 velData = texture2D(uVelocityTexture, aReference);

  vec3 pos = posData.xyz;
  float phase = posData.w;
  float speed = length(velData.xyz);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Particle Size Attenuation based on distance to camera
  float distToCam = -mvPosition.z;
  float size = uParticleBaseSize * (16.0 / max(distToCam, 1.0)) * uDpr;

  // High-speed particles stretch slightly or enlarge
  size *= (1.0 + clamp(speed * 0.12, 0.0, 0.6));
  gl_PointSize = clamp(size, 1.0, 6.0);

  // Dynamic Color Interpolation across the palette (Figma Blue Direction)
  // Deep Core (uColorCore) -> Mid Body (uColorPrimary #5CD9FF) -> Distant Shell (uColorSecondary #2C719B)
  float rDist = length(pos) / 7.5;

  vec3 col = mix(uColorCore, uColorPrimary, smoothstep(0.0, 0.35, rDist));
  col = mix(col, uColorSecondary, smoothstep(0.35, 0.85, rDist));

  // Highlight accents for high-velocity particles and phase sparkles
  float spark = smoothstep(2.0, 6.5, speed) + 0.25 * max(0.0, sin(phase * 6.28 + uTime * 2.0));
  col = mix(col, uColorHighlight, clamp(spark * 0.45, 0.0, 0.7));

  vColor = col;

  // Density-aware alpha: outer shell has slightly higher alpha to stay visible;
  // dense core has delicate alpha to allow deep volumetric accumulation without whiteout
  float densityAtten = smoothstep(0.0, 0.5, rDist);
  float baseAlpha = mix(0.18, 0.32, densityAtten);
  vAlpha = clamp(baseAlpha + spark * 0.12, 0.15, 0.45);
}
`;
