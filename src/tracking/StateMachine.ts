import { ShapeType } from '../types/simulation';
import { InteractionMode, HandData, BimanualMetrics } from '../types/gestures';
import { GestureRecognizer, GestureEvent } from './GestureRecognizer';
import { SHAPE_SEQUENCE } from '../config/palettes';

export interface StateSnapshot {
  currentShape: ShapeType;
  interactionMode: InteractionMode;
  globalScale: number;
  activeHandsCount: number;
  lastGesture: string;
}

export class SimulationStateMachine {
  private recognizer = new GestureRecognizer();
  private currentShape: ShapeType = 'sun';
  private interactionMode: InteractionMode = 'idle';
  private globalScale = 1.0;
  private lastGestureName = 'None';

  private onMorphListeners: Set<(shape: ShapeType) => void> = new Set();
  private onModeListeners: Set<(mode: InteractionMode) => void> = new Set();
  private onScaleListeners: Set<(scale: number) => void> = new Set();

  public onMorph(fn: (shape: ShapeType) => void): () => void {
    this.onMorphListeners.add(fn);
    return () => this.onMorphListeners.delete(fn);
  }

  public onMode(fn: (mode: InteractionMode) => void): () => void {
    this.onModeListeners.add(fn);
    return () => this.onModeListeners.delete(fn);
  }

  public onScale(fn: (scale: number) => void): () => void {
    this.onScaleListeners.add(fn);
    return () => this.onScaleListeners.delete(fn);
  }

  public update(hands: HandData[], bimanual: BimanualMetrics, now: number): void {
    const event: GestureEvent | null = this.recognizer.process(hands, bimanual, now);

    if (event) {
      this.lastGestureName = event.sourceGesture;

      switch (event.type) {
        case 'morph_shape':
          if (event.targetShape && event.targetShape !== this.currentShape) {
            this.currentShape = event.targetShape;
            this.onMorphListeners.forEach((fn) => fn(this.currentShape));
          }
          break;

        case 'scale_change':
          if (event.scale !== undefined) {
            this.globalScale = event.scale;
            this.onScaleListeners.forEach((fn) => fn(this.globalScale));
          }
          break;

        case 'mode_change':
          if (event.mode) {
            this.interactionMode = event.mode;
            this.onModeListeners.forEach((fn) => fn(this.interactionMode));
          }
          break;
      }
    } else if (hands.length === 0) {
      if (this.interactionMode !== 'idle') {
        this.interactionMode = 'idle';
        this.onModeListeners.forEach((fn) => fn('idle'));
      }
      this.lastGestureName = 'None';
    } else {
      // Hands are in frame, but no attract/repel gesture is actively held
      if (this.interactionMode !== 'idle') {
        this.interactionMode = 'idle';
        this.onModeListeners.forEach((fn) => fn('idle'));
      }
      this.lastGestureName = hands[0]?.gesture !== 'none' ? hands[0]?.gesture : 'None';
    }
  }

  public setShapeManually(shape: ShapeType): void {
    this.currentShape = shape;
    const idx = SHAPE_SEQUENCE.indexOf(shape);
    if (idx !== -1) {
      this.recognizer.setShapeIndex(idx);
    }
    this.onMorphListeners.forEach((fn) => fn(shape));
  }

  public setScaleManually(scale: number): void {
    this.globalScale = scale;
    this.recognizer.setScale(scale);
    this.onScaleListeners.forEach((fn) => fn(scale));
  }

  public getSnapshot(): StateSnapshot {
    return {
      currentShape: this.currentShape,
      interactionMode: this.interactionMode,
      globalScale: this.globalScale,
      activeHandsCount: 0,
      lastGesture: this.lastGestureName
    };
  }

  public getCurrentShape(): ShapeType {
    return this.currentShape;
  }

  public getGlobalScale(): number {
    return this.globalScale;
  }

  public getInteractionMode(): InteractionMode {
    return this.interactionMode;
  }
}
