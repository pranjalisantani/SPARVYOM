import { CameraDeviceInfo, CameraPermissionState, CameraState } from '../types/camera';

export class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private currentStream: MediaStream | null = null;
  private state: CameraState = {
    permission: 'prompt',
    selectedDeviceId: null,
    availableDevices: [],
    isStreaming: false,
    error: null,
    videoWidth: 640,
    videoHeight: 480
  };

  private listeners: Set<(state: CameraState) => void> = new Set();

  constructor() {
    this.createVideoElement();
  }

  private createVideoElement(): void {
    if (typeof document === 'undefined') return;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.width = 640;
    this.videoElement.height = 480;
  }

  public subscribe(callback: (state: CameraState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public async checkPermissions(): Promise<CameraPermissionState> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.state.permission = 'unsupported';
      this.notify();
      return 'unsupported';
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const query = await navigator.permissions.query({ name: 'camera' as PermissionName });
        this.state.permission = query.state as CameraPermissionState;
        query.onchange = () => {
          this.state.permission = query.state as CameraPermissionState;
          this.notify();
        };
      }
    } catch {
      // Browser doesn't support permissions.query for camera
    }

    this.notify();
    return this.state.permission;
  }

  public async enumerateDevices(): Promise<CameraDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`
        }));
      this.state.availableDevices = videoDevices;
      this.notify();
      return videoDevices;
    } catch {
      return [];
    }
  }

  public async startStream(preferredDeviceId?: string): Promise<boolean> {
    if (!this.videoElement) this.createVideoElement();

    this.stopStream();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;

      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        await this.videoElement.play();
        this.state.videoWidth = this.videoElement.videoWidth || 640;
        this.state.videoHeight = this.videoElement.videoHeight || 480;
      }

      this.state.isStreaming = true;
      this.state.permission = 'granted';
      this.state.error = null;
      this.state.selectedDeviceId = preferredDeviceId || null;

      await this.enumerateDevices();
      this.notify();
      return true;
    } catch (err: unknown) {
      console.error('Camera stream access failed:', err);
      this.state.isStreaming = false;
      this.state.permission = 'denied';
      this.state.error = (err as Error).message || 'Camera access was denied.';
      this.notify();
      return false;
    }
  }

  public stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.state.isStreaming = false;
    this.notify();
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public getState(): CameraState {
    return this.state;
  }
}
