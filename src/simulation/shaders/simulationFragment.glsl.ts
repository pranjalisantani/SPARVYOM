export const simulationFragmentShader = /* glsl */ `
precision highp float;

#ifdef RENDER_POSITION

uniform sampler2D uCurrentPosition;
uniform sampler2D uCurrentVelocity;
uniform float uDeltaTime;

varying vec2 vUv;

void main() {
  vec4 posData = texture2D(uCurrentPosition, vUv);
  vec4 velData = texture2D(uCurrentVelocity, vUv);

  float dt = min(uDeltaTime, 0.033);
  vec3 pos = posData.xyz + velData.xyz * dt;

  gl_FragColor = vec4(pos, posData.w);
}

#else

uniform sampler2D uCurrentPosition;
uniform sampler2D uCurrentVelocity;
uniform sampler2D uTargetPositionA;
uniform sampler2D uTargetPositionB;

uniform float uMorphProgress;     // 0.0 = Shape A, 1.0 = Shape B
uniform float uDeltaTime;
uniform float uTime;

// Physics Parameters
uniform float uReturnStrength;    // Spring constant
uniform float uDamping;           // Friction coefficient
uniform float uCurlStrength;      // Fluid turbulence scale
uniform float uCurlFrequency;     // Noise scale
uniform float uMaxSpeed;          // Terminal velocity clamp

// Hand Interaction (up to 2 hands)
uniform vec3 uHandPos[2];
uniform vec3 uHandVel[2];
uniform float uHandStrength[2];   // Positive = attract, Negative = repel
uniform float uHandRadius[2];
uniform int uHandActive[2];

// Bimanual global scale / compression factor
uniform float uGlobalScale;

varying vec2 vUv;

// --- Simplex Noise Functions for GPU Curl Noise ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Compute divergence-free 3D curl of simplex noise (safe against zero division / NaNs)
vec3 computeCurl(vec3 p, float freq) {
  const float e = 0.08;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  float p_x0 = snoise((p - dx) * freq);
  float p_x1 = snoise((p + dx) * freq);
  float p_y0 = snoise((p - dy) * freq);
  float p_y1 = snoise((p + dy) * freq);
  float p_z0 = snoise((p - dz) * freq);
  float p_z1 = snoise((p + dz) * freq);

  float x = (p_y1 - p_y0) - (p_z1 - p_z0);
  float y = (p_z1 - p_z0) - (p_x1 - p_x0);
  float z = (p_x1 - p_x0) - (p_y1 - p_y0);

  vec3 v = vec3(x, y, z);
  float len = length(v);
  if (len < 1e-4) return vec3(0.0);
  return v / len;
}

void main() {
  vec4 posData = texture2D(uCurrentPosition, vUv);
  vec4 velData = texture2D(uCurrentVelocity, vUv);
  vec4 targetA = texture2D(uTargetPositionA, vUv);
  vec4 targetB = texture2D(uTargetPositionB, vUv);

  vec3 pos = posData.xyz;
  vec3 vel = velData.xyz;

  // Smooth Hermite interpolation of target shape
  float t = smoothstep(0.0, 1.0, uMorphProgress);
  vec3 target = mix(targetA.xyz, targetB.xyz, t) * uGlobalScale;

  // 1. Spring-Damper steering force toward target formation
  vec3 displacement = target - pos;
  vec3 fSteering = displacement * uReturnStrength;

  // 2. Safe Curl Noise turbulence (computed ONLY in velocity pass)
  vec3 fCurl = vec3(0.0);
  if (uCurlStrength > 0.001) {
    vec3 curl = computeCurl(pos + vec3(uTime * 0.1), uCurlFrequency);
    fCurl = curl * uCurlStrength;
  }

  // 3. Hand Interaction Forces (Attract / Repulse / Swirl)
  vec3 fHands = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    if (uHandActive[i] == 1) {
      vec3 toHand = uHandPos[i] - pos;
      float dist = length(toHand);
      float radius = uHandRadius[i];

      if (dist < radius && dist > 0.001) {
        vec3 dir = toHand / dist;
        // Softened inverse-square law
        float attenuation = 1.0 - smoothstep(0.0, radius, dist);
        float forceMag = (uHandStrength[i] / (dist * dist + 1.2)) * attenuation;

        // Linear attraction / repulsion
        fHands += dir * forceMag;

        // Swirl vortex force induced by hand velocity
        float handSpeed = length(uHandVel[i]);
        if (handSpeed > 0.05) {
          vec3 swirlDir = cross(normalize(uHandVel[i]), dir);
          fHands += swirlDir * (handSpeed * 15.0 * attenuation);
        }
      }
    }
  }

  // Combine forces
  vec3 totalForce = fSteering + fCurl + fHands;

  // Integrate velocity (Semi-implicit Euler)
  float dt = min(uDeltaTime, 0.033);
  vel += totalForce * dt;
  vel *= pow(uDamping, dt * 60.0);

  // Clamp max velocity
  float currentSpeed = length(vel);
  if (currentSpeed > uMaxSpeed) {
    vel = (vel / currentSpeed) * uMaxSpeed;
  }

  gl_FragColor = vec4(vel, velData.w);
}
#endif
`;
