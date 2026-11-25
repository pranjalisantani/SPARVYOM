export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private masterGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0.0 : 0.25;
      this.masterGain.connect(this.ctx.destination);

      // Lowpass resonant filter
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 350;
      this.filterNode.Q.value = 4.0;
      this.filterNode.connect(this.masterGain);

      // Cosmic drone oscillator
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 55; // A1 low drone

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.15;
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.filterNode);
      this.droneOsc.start();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0 : 0.25, this.ctx.currentTime, 0.08);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playMorphChime(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    // Harmonic pentatonic bell frequencies (C minor pentatonic: C4, Eb4, F4, G4, Bb4, C5)
    const frequencies = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25];
    const baseFreq = frequencies[Math.floor(Math.random() * frequencies.length)];

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.85);
  }

  public playBurst(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  public updateModulation(speed: number, scale: number): void {
    if (this.isMuted || !this.filterNode || !this.ctx) return;
    const targetFreq = 250 + Math.min(speed * 60, 1200) + (scale - 1.0) * 150;
    this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }
}
