export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface CameraState {
  permission: CameraPermissionState;
  selectedDeviceId: string | null;
  availableDevices: CameraDeviceInfo[];
  isStreaming: boolean;
  error: string | null;
  videoWidth: number;
  videoHeight: number;
}
