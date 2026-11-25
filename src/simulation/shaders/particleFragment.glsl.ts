export const particleFragmentShader = /* glsl */ `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Center-relative coordinates [-0.5, 0.5]
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  // Circular point sprite mask
  if (dist > 0.5) {
    discard;
  }

  // Gaussian soft radial glow falloff
  // High intensity at core (dist ~ 0), decaying cleanly at perimeter
  float intensity = exp(-dist * dist * 22.0);

  // Crisp starlight core glint that preserves chromatic hue
  float coreSpark = exp(-dist * dist * 72.0);
  vec3 finalColor = vColor * (intensity + coreSpark * 0.35);

  gl_FragColor = vec4(finalColor, vAlpha * intensity);
}
`;
