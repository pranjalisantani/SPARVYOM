import React, { useState } from 'react';
import { Camera, Sparkles, MousePointer, ShieldCheck, AlertCircle, Hand } from 'lucide-react';
import { CameraDeviceInfo } from '../types/camera';

interface PermissionModalProps {
  isOpen: boolean;
  devices: CameraDeviceInfo[];
  error: string | null;
  onRequestCamera: (deviceId?: string) => Promise<boolean>;
  onContinueWithoutCamera: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  devices,
  error,
  onRequestCamera,
  onContinueWithoutCamera
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleStart = async () => {
    setIsLoading(true);
    await onRequestCamera(selectedDevice || undefined);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/85 p-8 shadow-2xl backdrop-blur-3xl">
        {/* Glow backdrop aura */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon & Brand */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-cyan-500/25">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-heading text-white tracking-wide">Enter SPARVYOM</h2>
            <p className="text-xs text-white/60">An immersive gesture-controlled particle experience</p>
          </div>
        </div>

        {/* Content Description */}
        <div className="space-y-4 mb-6 text-sm text-white/80 leading-relaxed">
          <p>
            Control an invariant system of <strong>131,072 3D particles</strong> floating in space using natural hand gestures.
            All computer vision tracking runs <strong>100% locally on your GPU</strong> via WebAssembly — no video is ever recorded or uploaded.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <Hand className="w-3.5 h-3.5" />
                <span>Hand Physics</span>
              </span>
              <span className="text-[11px] text-white/60">
                Pinch, cupped fist, open palm, and two-hand scaling
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
              <span className="text-xs font-semibold text-fuchsia-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>7 Universes</span>
              </span>
              <span className="text-[11px] text-white/60">
                Sun, Saturn, Spiral Galaxy, Heart, Waves, Silk, Nebula
              </span>
            </div>
          </div>
        </div>

        {/* Device Selection if multiple devices found */}
        {devices.length > 1 && (
          <div className="mb-6">
            <label className="block text-xs font-medium text-white/70 mb-2">Select Camera Input:</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Default Front Facing Camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error notification if permission was previously blocked */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Camera Access Blocked</p>
              <p className="text-[11px] opacity-80 mt-0.5">{error}. You can continue seamlessly with mouse & keyboard.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>{isLoading ? 'Calibrating Camera...' : 'Enable Gesture Camera'}</span>
          </button>

          <button
            onClick={onContinueWithoutCamera}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Mouse & Keyboard Only</span>
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local client-side execution • Zero data transmission</span>
        </div>
      </div>
    </div>
  );
};
