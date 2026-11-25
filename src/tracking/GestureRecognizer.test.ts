import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GestureRecognizer } from './GestureRecognizer';
import { HandData, BimanualMetrics } from '../types/gestures';

describe('GestureRecognizer', () => {
  let recognizer: GestureRecognizer;

  beforeEach(() => {
    recognizer = new GestureRecognizer();
  });

  const createDummyHand = (overrides: Partial<HandData> = {}): HandData => ({
    handedness: 'Right',
    landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0.0 })),
    palmCenter: new THREE.Vector3(0, 0, 0),
    palmNormal: new THREE.Vector3(0, 1, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    pinchDistance: 0.2,
    pinchMidpoint: new THREE.Vector3(0, 0, 0),
    isPinching: false,
    isOpenPalm: false,
    isFist: false,
    isThumbsUp: false,
    confidence: 0.95,
    gesture: 'none',
    ...overrides
  });

  const emptyBimanual: BimanualMetrics = {
    handCount: 1,
    hands: [],
    centerPoint: new THREE.Vector3(),
    spanDistance: 0,
    spanDelta: 0,
    isFraming: false
  };

  it('detects attract mode when fist is presented', () => {
    const hand = createDummyHand({ isFist: true, gesture: 'fist' });
    const event = recognizer.process([hand], emptyBimanual, 1000);
    expect(event).not.toBeNull();
    expect(event?.type).toBe('mode_change');
    expect(event?.mode).toBe('attract');
  });

  it('detects repel mode when open palm is presented', () => {
    const hand = createDummyHand({ isOpenPalm: true, gesture: 'open_palm' });
    const event = recognizer.process([hand], emptyBimanual, 1000);
    expect(event).not.toBeNull();
    expect(event?.type).toBe('mode_change');
    expect(event?.mode).toBe('repel');
  });

  it('detects attract mode when pinch is presented without morphing shape', () => {
    const hand = createDummyHand({ isPinching: true, gesture: 'pinch' });
    const event = recognizer.process([hand], emptyBimanual, 1000);
    expect(event).not.toBeNull();
    expect(event?.type).toBe('mode_change');
    expect(event?.mode).toBe('attract');
  });

  it('triggers shape morph to saturn on sustained thumbs_up gesture', () => {
    const hand = createDummyHand({ isThumbsUp: true, gesture: 'thumbs_up' });

    // First frame (hold = 0ms)
    let event = recognizer.process([hand], emptyBimanual, 1000);
    expect(event).toBeNull();

    // After hold duration (500ms >= 400ms threshold)
    event = recognizer.process([hand], emptyBimanual, 1500);
    expect(event).not.toBeNull();
    expect(event?.type).toBe('morph_shape');
    expect(event?.targetShape).toBe('saturn');
  });

  it('scales universe when two hands move apart or together', () => {
    const hand1 = createDummyHand({ palmCenter: new THREE.Vector3(-2, 0, 0) });
    const hand2 = createDummyHand({ palmCenter: new THREE.Vector3(2, 0, 0) });
    const bimanual: BimanualMetrics = {
      handCount: 2,
      hands: [hand1, hand2],
      centerPoint: new THREE.Vector3(0, 0, 0),
      spanDistance: 4.0,
      spanDelta: 0,
      isFraming: false
    };

    // First baseline sample
    recognizer.process([hand1, hand2], bimanual, 1000);

    // Expand hands from 4.0 to 6.0 units
    bimanual.spanDistance = 6.0;
    const event = recognizer.process([hand1, hand2], bimanual, 1100);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('scale_change');
    expect(event?.scale).toBeGreaterThan(1.0);
  });
});
