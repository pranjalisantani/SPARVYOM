import { ParticleSimulationConfig } from '../types/simulation';

// Particle Count Tiering
// 512x256 = 131,072 particles (Optimal sweet spot for universal 60 FPS WebGL2 performance)
// 512x512 = 262,144 particles (High tier)
export const DEFAULT_SIM_CONFIG: ParticleSimulationConfig = {
  textureWidth: 512,
  textureHeight: 256,
  particleCount: 512 * 256, // 131,072 particles
  maxSpeed: 8.0,
  damping: 0.94,
  returnStrength: 2.8,
  curlNoiseFrequency: 0.25,
  curlNoiseStrength: 1.2
};

export const INTERACTION_PARAMS = {
  // Hand force thresholds
  pinchThreshold: 0.075,      // Normalized distance thumb tip to index tip
  fistCurvatureThreshold: 0.75,
  openPalmSpreadThreshold: 0.25,

  // Physics Strengths
  attractorStrength: 45.0,    // Pull particles into palm center
  repulsorStrength: -55.0,    // Push particles away from open palm
  swirlStrength: 25.0,        // Impart angular momentum from hand velocity
  bimanualScaleSensitivity: 3.5,

  // Smoothing
  oneEuroMinCutoff: 1.0,      // Hz (eliminates resting jitter)
  oneEuroBeta: 0.007,         // Speed coefficient (eliminates lag during rapid motion)
  oneEuroDcutoff: 1.0,

  // Debouncing
  gestureHoldDurationMs: 400, // Ms needed to confirm discrete gesture trigger
  morphCooldownMs: 1200       // Minimum time between automated shape switches
};

export const POST_PROCESSING_DEFAULTS = {
  bloomStrength: 0.40,
  bloomRadius: 0.45,
  bloomThreshold: 0.88,
  toneMappingExposure: 0.90
};
