import { HandData, BimanualMetrics, InteractionMode, GestureType } from '../types/gestures';
import { ShapeType } from '../types/simulation';
import { SHAPE_SEQUENCE } from '../config/palettes';
import { INTERACTION_PARAMS } from '../config/constants';

export interface GestureEvent {
  type: 'morph_shape' | 'scale_change' | 'mode_change' | 'anchor_state';
  targetShape?: ShapeType;
  scale?: number;
  mode?: InteractionMode;
  sourceGesture: GestureType;
}

export class GestureRecognizer {
  private lastGestureTimestamp = 0;
  private activeGesture: GestureType = 'none';
  private gestureHoldStart = 0;
  private currentShapeIndex = 0;
  private lastSpanDistance: number | null = null;
  private currentScale = 1.0;

  public process(
    hands: HandData[],
    bimanual: BimanualMetrics,
    now: number
  ): GestureEvent | null {
    // 1. Process Bimanual Two-Hand Expansion / Contraction
    if (bimanual.handCount === 2) {
      if (this.lastSpanDistance !== null) {
        const delta = bimanual.spanDistance - this.lastSpanDistance;
        // Smooth proportional scaling without harsh threshold deadzone
        if (Math.abs(delta) > 0.015) {
          this.currentScale = Math.min(2.5, Math.max(0.4, this.currentScale + delta * 0.35));
          this.lastSpanDistance = bimanual.spanDistance;
          return {
            type: 'scale_change',
            scale: this.currentScale,
            sourceGesture: delta > 0 ? 'expand' : 'contract'
          };
        }
      } else {
        this.lastSpanDistance = bimanual.spanDistance;
      }

      // Bimanual Framing triggers Heart shape
      if (bimanual.isFraming) {
        if (now - this.lastGestureTimestamp > INTERACTION_PARAMS.morphCooldownMs) {
          this.lastGestureTimestamp = now;
          return {
            type: 'morph_shape',
            targetShape: 'heart',
            sourceGesture: 'framing'
          };
        }
      }
    } else {
      this.lastSpanDistance = null;
    }

    // 2. Process Single-Hand Primary Gesture
    const primaryHand = hands[0];
    if (!primaryHand) {
      this.activeGesture = 'none';
      return null;
    }

    const detected = primaryHand.gesture;

    // Track gesture duration for debounced trigger
    if (detected !== this.activeGesture) {
      this.activeGesture = detected;
      this.gestureHoldStart = now;
    }

    const holdTime = now - this.gestureHoldStart;

    // A. Thumbs Up: Morph to Saturn & Rings
    if (detected === 'thumbs_up' && holdTime > INTERACTION_PARAMS.gestureHoldDurationMs) {
      if (now - this.lastGestureTimestamp > INTERACTION_PARAMS.morphCooldownMs) {
        this.lastGestureTimestamp = now;
        this.gestureHoldStart = now;
        return {
          type: 'morph_shape',
          targetShape: 'saturn',
          sourceGesture: 'thumbs_up'
        };
      }
    }

    // B. Physical Force Field Modes
    // Pinch: Attract particles to pinch midpoint (does NOT switch shapes)
    if (detected === 'pinch' || primaryHand.isPinching) {
      return {
        type: 'mode_change',
        mode: 'attract',
        sourceGesture: 'pinch'
      };
    }

    // Fist: Attract particles to palm center
    if (primaryHand.isFist || detected === 'fist') {
      return {
        type: 'mode_change',
        mode: 'attract',
        sourceGesture: 'fist'
      };
    }

    // Open Palm: Repel particles away from palm
    if (primaryHand.isOpenPalm || detected === 'open_palm') {
      return {
        type: 'mode_change',
        mode: 'repel',
        sourceGesture: 'open_palm'
      };
    }

    return null;
  }

  public setShapeIndex(index: number): void {
    this.currentShapeIndex = (index + SHAPE_SEQUENCE.length) % SHAPE_SEQUENCE.length;
  }

  public getCurrentShapeIndex(): number {
    return this.currentShapeIndex;
  }

  public getScale(): number {
    return this.currentScale;
  }

  public setScale(scale: number): void {
    this.currentScale = Math.min(2.5, Math.max(0.4, scale));
  }
}
