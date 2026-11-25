import * as THREE from 'three';

/**
 * 1€ (One-Euro) Filter
 * An adaptive low-pass filter with dynamic cutoff frequency.
 * At low speed, low cutoff eliminates jitter.
 * At high speed, high cutoff eliminates lag.
 * Reference: Casiez et al., CHI 2012.
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * (this.s ?? value);
    this.y = this.s;
    return this.y;
  }

  filterWithAlpha(value: number, alpha: number): number {
    return this.filter(value, alpha);
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  last(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTimestamp: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: number, timestamp: number): number {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      return this.xFilter.filter(x, 1.0);
    }

    const dt = Math.max((timestamp - this.lastTimestamp) / 1000.0, 1e-5);
    this.lastTimestamp = timestamp;

    const prevX = this.xFilter.last();
    const dx = (x - prevX) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(x, this.alpha(cutoff, dt));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTimestamp = null;
  }
}

export class OneEuroFilter3D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private filterZ: OneEuroFilter;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.filterX = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterZ = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(v: THREE.Vector3, timestamp: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.filterX.filter(v.x, timestamp),
      this.filterY.filter(v.y, timestamp),
      this.filterZ.filter(v.z, timestamp)
    );
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.filterZ.reset();
  }
}
