# SPARVYOM (स्पर्शव्योम)

> **Immersive, Gesture-Controlled 3D Particle Experience**<br>
> *"One Continuous Particle Simulation across Celestial Universes"*

---

## Overview

**SPARVYOM** is a web-based real-time 3D particle universe driven by computer vision and hand tracking. Using WebGL2 GPGPU compute shaders and Google MediaPipe Hand Landmarker, users shape, attract, scatter, and morph a continuous field of **131,072+ particles** in response to physical hand gestures.

The central technical principle: **One continuous particle simulation with invariant particle identities**. Formations do not despawn or cross-fade; particles smoothly steer and flow from one mathematical manifold to another under physical force fields.

---

## Architectural Highlights

- **GPGPU Ping-Pong Simulation**: 100% GPU-accelerated particle physics via WebGL2 Float32 Framebuffer Objects (FBO). Position and velocity buffers are updated in custom GLSL shaders at native monitor refresh rates (60–144 Hz).
- **Physical Force Fields**:
  - **Attractor Field**: Closed fist or cupping pulls particles into a dense gravitational core.
  - **Repulsor Field**: Open palm scatters particles outward via inverse-square repulsion.
  - **Swirl / Vortex**: Hand velocity injects angular momentum, producing curling eddies.
  - **Divergence-Free Curl Noise**: 3D Simplex curl field generates authentic fluid smoke dynamics.
- **Parametric Geometric Attractors**:
  1. **Solar Sun**: High-density Fibonacci sphere with radiant core bloom and corona dust.
  2. **Saturn & Rings**: Planetary sphere encircled by a tilted annular disc with Cassini gaps.
  3. **Spiral Galaxy**: 4-arm logarithmic spiral vortex with differential rotation.
  4. **Cosmic Heart**: Volumetric 3D cardioid manifold.
  5. **Harmonic Sphere**: Sinusoidal standing wave lattice.
  6. **Digital Silk**: Flowing undulating ribbon manifold with shallow depth of field.
  7. **Cosmic Nebula**: Open starfield with Brownian turbulence.
- **Real-Time Hand Tracking & Landmark Filtering**:
  - MediaPipe Hand Landmarker running client-side with GPU delegate.
  - $1€$ (One-Euro) temporal adaptive low-pass filter eliminates sensor jitter while preserving responsiveness.
  - Bimanual distance metrics enable continuous universe scaling and compression.
- **Cinematic Rendering**:
  - Additive blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`) with depth writes disabled.
  - Multi-stage UnrealBloom post-processing with ACESFilmic tone mapping.
  - Distance-attenuated Gaussian point sprites with sharp radiant cores.
- **Ambient Generative Synthesizer**:
  - Interactive Web Audio API synth layer with resonant lowpass filter modulated by particle speed and scale.
  - Pentatonic chimes triggered on shape morph transitions.
- **Universal Accessibility Fallback**:
  - Full mouse & keyboard emulation when webcam is unavailable or denied.

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node.js v24)
- Modern browser with WebGL2 support (Chrome, Edge, Firefox, Safari)
- Webcam (optional; full mouse fallback provided)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/pranjalisantani/SPARVYOM.git
cd SPARVYOM

# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## Controls Reference

### Physical Hand Gestures (Webcam)

| Gesture | Physical Action | Simulation Response |
| :--- | :--- | :--- |
| **Pinch** | Bring thumb tip and index tip together ($< 7.5\text{cm}$) | Hold for 350ms to cycle to the next cosmic formation |
| **Thumbs Up** | Extend thumb upward with other fingers curled | State confirmation chime; locks/anchors formation to Saturn / Sun |
| **Open Palm** | Spread all 5 fingers facing the screen | Repulsor force field: scatters particles away from palm |
| **Closed Fist** | Curl fingers into palm | Attractor force field: collapses particles into dense nucleus |
| **Two-Hand Span**| Move two hands outward / inward | Expands or compresses the universe scale ($0.4\times$ to $2.5\times$) |
| **Bimanual Frame**| Form rectangular aperture with both hands | Morphs directly into the 3D Cosmic Heart |

### Mouse & Keyboard Fallback

- **Click & Drag**: Gravitational attractor pulling particles to mouse cursor.
- **Move Cursor**: Repels particles gently with dynamic camera parallax.
- **Mouse Wheel**: Scale particle universe up and down.
- **Keys 1 to 7**: Instant morph to Sun, Saturn, Galaxy, Heart, Wave, Ribbon, Nebula.
- **Spacebar**: Trigger kinetic shockwave burst.
- **Key M**: Toggle audio synth mute.
- **Key C**: Toggle camera picture-in-picture stream.
- **Key ?**: Toggle gesture cheatsheet.

---

## Testing & Quality Assurance

```bash
npm test
```

Unit test suite validates:
- Parametric coordinate generators for all 7 shapes (no NaNs, finite bounds, correct memory strides).
- Gesture recognition heuristics, hold durations, debouncing, and bimanual metric extraction.
