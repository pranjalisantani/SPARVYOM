import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface DevDiagnosticPanelProps {
  cameraReady: boolean;
  videoResolution: string;
  videoFrameStatus: string;
  mediapipeStatus: 'READY' | 'INITIALIZING' | 'ERROR' | 'STANDBY';
  handsDetected: number;
  currentGesture: string;
  fps: number;
}

export const DevDiagnosticPanel: React.FC<DevDiagnosticPanelProps> = ({
  cameraReady,
  videoResolution,
  videoFrameStatus,
  mediapipeStatus,
  handsDetected,
  currentGesture,
  fps
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div
      className="fixed bottom-4 left-4 z-40 font-mono text-[11px] select-none pointer-events-auto transition-all duration-200"
      style={{
        background: 'rgba(6, 17, 29, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(92, 217, 255, 0.3)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(92, 217, 255, 0.08)',
        minWidth: isCollapsed ? 'auto' : '280px',
        maxWidth: '340px'
      }}
    >
      {/* Header bar */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-cyan-500/20 text-cyan-300 hover:text-cyan-100"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[10px] text-white">
            DEV DIAGNOSTICS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 font-bold">{fps} FPS</span>
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </div>
      </div>

      {/* Body content */}
      {!isCollapsed && (
        <div className="p-3 space-y-2 text-white/90">
          {/* CAMERA */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">CAMERA:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                cameraReady
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-950/80 text-red-400 border border-red-500/40'
              }`}
            >
              {cameraReady ? 'READY' : 'NOT READY'}
            </span>
          </div>

          {/* VIDEO */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">VIDEO:</span>
            <span className="text-cyan-200">
              {videoResolution} ({videoFrameStatus})
            </span>
          </div>

          {/* MEDIAPIPE */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">MEDIAPIPE:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                mediapipeStatus === 'READY'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                  : mediapipeStatus === 'INITIALIZING'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
                  : mediapipeStatus === 'ERROR'
                  ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                  : 'bg-white/10 text-white/50 border border-white/10'
              }`}
            >
              {mediapipeStatus}
            </span>
          </div>

          {/* HANDS DETECTED */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">HANDS DETECTED:</span>
            <span
              className={`font-bold text-[11px] ${
                handsDetected > 0 ? 'text-cyan-300' : 'text-white/40'
              }`}
            >
              {handsDetected} / 2
            </span>
          </div>

          {/* GESTURE */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">GESTURE:</span>
            <span className="font-semibold text-cyan-300 uppercase">
              {currentGesture || 'NONE'}
            </span>
          </div>

          {/* FPS */}
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <span className="text-white/60">FPS:</span>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span
                className={`font-bold ${
                  fps >= 50
                    ? 'text-emerald-400'
                    : fps >= 30
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {fps} ACTUAL FPS
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
