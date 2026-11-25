import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandData, HandLandmark, BimanualMetrics, Handedness, GestureType } from '../types/gestures';
import { OneEuroFilter3D } from '../math/oneEuroFilter';
import { INTERACTION_PARAMS } from '../config/constants';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private isReady = false;

  // Frame deduplication & inference throttling
  private lastVideoTime = -1;
  private lastInferenceTime = 0;
  private lastLandmarkTimestamp = 0;
  private lastResult: { hands: HandData[]; bimanual: BimanualMetrics } = {
    hands: [],
    bimanual: {
      handCount: 0,
      hands: [],
      centerPoint: new THREE.Vector3(),
      spanDistance: 0,
      spanDelta: 0,
      isFraming: false
    }
  };

  // Smoothing filters: 2 hands x 21 landmarks
  private filters: OneEuroFilter3D[][] = [];
  private lastPalmCenters: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3()];
  private lastTimestamps: number[] = [0, 0];

  constructor() {
    // Initialize 2 hands with 21 filters each
    for (let h = 0; h < 2; h++) {
      const handFilters: OneEuroFilter3D[] = [];
      for (let l = 0; l < 21; l++) {
        handFilters.push(
          new OneEuroFilter3D(
            INTERACTION_PARAMS.oneEuroMinCutoff,
            INTERACTION_PARAMS.oneEuroBeta,
            INTERACTION_PARAMS.oneEuroDcutoff
          )
        );
      }
      this.filters.push(handFilters);
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        numHands: 2,
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.warn('Failed to initialize MediaPipe with GPU delegate; retrying on CPU delegate:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU'
          },
          numHands: 2,
          runningMode: 'VIDEO'
        });
        this.isReady = true;
        this.isInitializing = false;
        return true;
      } catch (cpuErr) {
        console.error('Critical failure initializing HandLandmarker:', cpuErr);
        this.isInitializing = false;
        return false;
      }
    }
  }

  public processVideoFrame(
    video: HTMLVideoElement,
    timestamp: number
  ): { hands: HandData[]; bimanual: BimanualMetrics } {
    if (!this.isReady || !this.landmarker || video.readyState < 2) {
      return this.lastResult;
    }

    // Skip redundant inferences if video hasn't delivered a new frame or within 28ms (~35 FPS)
    const now = performance.now();
    if (video.currentTime === this.lastVideoTime || now - this.lastInferenceTime < 28) {
      return this.lastResult;
    }
    this.lastVideoTime = video.currentTime;
    this.lastInferenceTime = now;

    // Enforce strictly monotonic timestamp required by MediaPipe VIDEO mode
    const safeTimestamp = Math.max(Math.round(timestamp), this.lastLandmarkTimestamp + 1);
    this.lastLandmarkTimestamp = safeTimestamp;

    const results = this.landmarker.detectForVideo(video, safeTimestamp);
    const hands: HandData[] = [];

    if (results.landmarks && results.landmarks.length > 0) {
      for (let h = 0; h < results.landmarks.length; h++) {
        const rawLandmarks = results.landmarks[h];
        const handedness: Handedness =
          results.handednesses[h] && results.handednesses[h][0]?.categoryName === 'Left'
            ? 'Left'
            : 'Right';

        // Apply One-Euro filter across all 21 keypoints
        const smoothedLandmarks: HandLandmark[] = [];
        for (let l = 0; l < 21; l++) {
          const raw = rawLandmarks[l];
          const rawVec = new THREE.Vector3(raw.x, raw.y, raw.z);
          const smoothedVec = this.filters[h][l].filter(rawVec, timestamp);
          smoothedLandmarks.push({
            x: smoothedVec.x,
            y: smoothedVec.y,
            z: smoothedVec.z
          });
        }

        // Map landmarks to 3D world space
        // Webcam is mirrored: x in [0, 1] maps from right to left
        const wrist = smoothedLandmarks[0];
        const middleMcp = smoothedLandmarks[9];
        const indexTip = smoothedLandmarks[8];
        const thumbTip = smoothedLandmarks[4];
        const pinkyMcp = smoothedLandmarks[17];

        const palmX = -((middleMcp.x + wrist.x) * 0.5 - 0.5) * 16.0;
        const palmY = -((middleMcp.y + wrist.y) * 0.5 - 0.5) * 12.0;
        const palmZ = -((middleMcp.z + wrist.z) * 0.5) * 15.0;
        const palmCenter = new THREE.Vector3(palmX, palmY, palmZ);

        // Compute velocity vector
        const dt = Math.max((timestamp - this.lastTimestamps[h]) / 1000.0, 1e-4);
        const velocity = palmCenter.clone().sub(this.lastPalmCenters[h]).divideScalar(dt);
        this.lastPalmCenters[h].copy(palmCenter);
        this.lastTimestamps[h] = timestamp;

        // Compute palm normal vector (cross product of wrist->middleMcp and wrist->pinkyMcp)
        const vWristToMiddle = new THREE.Vector3(
          middleMcp.x - wrist.x,
          middleMcp.y - wrist.y,
          middleMcp.z - wrist.z
        );
        const vWristToPinky = new THREE.Vector3(
          pinkyMcp.x - wrist.x,
          pinkyMcp.y - wrist.y,
          pinkyMcp.z - wrist.z
        );
        const palmNormal = new THREE.Vector3().crossVectors(vWristToMiddle, vWristToPinky).normalize();

        // Compute pinch metric
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = thumbTip.z - indexTip.z;
        const pinchDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const isPinching = pinchDistance < INTERACTION_PARAMS.pinchThreshold;

        const pinchMidpoint = new THREE.Vector3(
          -( (thumbTip.x + indexTip.x) * 0.5 - 0.5 ) * 16.0,
          -( (thumbTip.y + indexTip.y) * 0.5 - 0.5 ) * 12.0,
          -( (thumbTip.z + indexTip.z) * 0.5 ) * 15.0
        );

        // Finger extension tests (tip to wrist vs PIP to wrist distance)
        const isFingerExtended = (tipIdx: number, pipIdx: number) => {
          const tip = smoothedLandmarks[tipIdx];
          const pip = smoothedLandmarks[pipIdx];
          const dTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
          const dPipWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
          return dTipWrist > dPipWrist * 1.15;
        };

        const indexExtended = isFingerExtended(8, 6);
        const middleExtended = isFingerExtended(12, 10);
        const ringExtended = isFingerExtended(16, 14);
        const pinkyExtended = isFingerExtended(20, 18);

        const extendedCount =
          (indexExtended ? 1 : 0) +
          (middleExtended ? 1 : 0) +
          (ringExtended ? 1 : 0) +
          (pinkyExtended ? 1 : 0);

        const isOpenPalm = extendedCount >= 3;
        const isFist = extendedCount === 0;

        // Thumbs Up Test: thumb tip is significantly higher (lower y) than wrist & index, other fingers curled
        const isThumbUp =
          thumbTip.y < smoothedLandmarks[2].y - 0.08 &&
          thumbTip.y < indexTip.y - 0.05 &&
          extendedCount <= 1;

        // Classify primary gesture
        let gesture: GestureType = 'none';
        if (isThumbUp) gesture = 'thumbs_up';
        else if (isPinching) gesture = 'pinch';
        else if (isFist) gesture = 'fist';
        else if (isOpenPalm) gesture = 'open_palm';
        else if (indexExtended && extendedCount === 1) gesture = 'point';

        hands.push({
          handedness,
          landmarks: smoothedLandmarks,
          palmCenter,
          palmNormal,
          velocity,
          pinchDistance,
          pinchMidpoint,
          isPinching,
          isOpenPalm,
          isFist,
          isThumbsUp: isThumbUp,
          confidence: results.handednesses[h][0]?.score || 0.9,
          gesture
        });
      }
    }

    // Compute Bimanual (Two-Hand) Metrics
    const bimanual: BimanualMetrics = {
      handCount: hands.length,
      hands,
      centerPoint: new THREE.Vector3(),
      spanDistance: 0,
      spanDelta: 0,
      isFraming: false
    };

    if (hands.length === 2) {
      const h1 = hands[0].palmCenter;
      const h2 = hands[1].palmCenter;
      bimanual.centerPoint.copy(h1).add(h2).multiplyScalar(0.5);
      bimanual.spanDistance = h1.distanceTo(h2);

      // Check if framing: both index fingers and thumbs extended towards each other
      const isBothPinchingOrFraming =
        (hands[0].isPinching || hands[0].gesture === 'point') &&
        (hands[1].isPinching || hands[1].gesture === 'point');
      bimanual.isFraming = isBothPinchingOrFraming;
    }

    this.lastResult = { hands, bimanual };
    return this.lastResult;
  }

  public getReady(): boolean {
    return this.isReady;
  }
}
