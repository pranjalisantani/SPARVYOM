import * as THREE from 'three';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right';

export type GestureType =
  | 'none'
  | 'pinch'       // Index & thumb pinched close (continuous scaling or trigger)
  | 'open_palm'   // Fingers extended & spread (repulsion force field)
  | 'fist'        // Fingers curled tightly (attraction / gravitational collapse)
  | 'thumbs_up'   // Thumb extended upward, other fingers curled (state confirmation)
  | 'point'       // Index finger extended (precision cursor / swirl point)
  | 'peace'       // Index & middle extended (shape morph shortcut)
  | 'framing'     // Dual hands framing the viewport
  | 'expand'      // Bimanual expansion
  | 'contract';   // Bimanual contraction

export interface HandData {
  handedness: Handedness;
  landmarks: HandLandmark[]; // 21 3D landmarks
  worldLandmarks?: HandLandmark[];
  palmCenter: THREE.Vector3;
  palmNormal: THREE.Vector3;
  velocity: THREE.Vector3;
  pinchDistance: number;     // Normalized Euclidean distance thumb tip to index tip
  pinchMidpoint: THREE.Vector3;
  isPinching: boolean;
  isOpenPalm: boolean;
  isFist: boolean;
  isThumbsUp: boolean;
  confidence: number;
  gesture: GestureType;
}

export interface BimanualMetrics {
  handCount: number;
  hands: HandData[];
  centerPoint: THREE.Vector3;
  spanDistance: number;      // Distance between left & right palm centers
  spanDelta: number;         // Rate of expansion (+) or contraction (-)
  isFraming: boolean;
}

export type InteractionMode =
  | 'attract'
  | 'repel'
  | 'flow'
  | 'morph'
  | 'expand'
  | 'idle';
