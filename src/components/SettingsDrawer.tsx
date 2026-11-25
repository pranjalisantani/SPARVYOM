import React from 'react';
import { X, Sliders, Zap, RotateCcw, Sparkles, Activity } from 'lucide-react';

export interface TuningConfig {
  particleSize: number;
  bloomStrength: number;
  curlStrength: number;
  returnStrength: number;
  globalScale: number;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tuning: TuningConfig;
  onUpdateTuning: (newTuning: Partial<TuningConfig>) => void;
  onTriggerBurst: () => void;
  onResetScale: () => void;
  fps: number;
  particleCount: number;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  tuning,
  onUpdateTuning,
  onTriggerBurst,
  onResetScale,
  fps,
  particleCount
}) => {
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* Slide-out Drawer */}
      <aside className={`tuning-drawer ${isOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-white text-base">Spatial Tuning</h3>
              <p className="text-[11px] text-white/50">Real-time GPU physics & rendering</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Performance Stats Pill */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-white/70">Engine FPS:</span>
            <span className="font-mono font-bold text-emerald-400">{fps}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-white/70">Particles:</span>
            <span className="font-mono font-bold text-cyan-400">{particleCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Section: Particle Simulation Physics */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Simulation Physics</span>
          </h4>

          {/* Fluid Curl Turbulence */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">Curl Turbulence (Fluid)</span>
              <span className="font-mono text-cyan-300">{tuning.curlStrength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={tuning.curlStrength}
              onChange={(e) => onUpdateTuning({ curlStrength: parseFloat(e.target.value) })}
              className="spatial-slider"
            />
          </div>

          {/* Return Strength (Spring Elasticity) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">Elasticity (Return Speed)</span>
              <span className="font-mono text-cyan-300">{tuning.returnStrength.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="5.5"
              step="0.1"
              value={tuning.returnStrength}
              onChange={(e) => onUpdateTuning({ returnStrength: parseFloat(e.target.value) })}
              className="spatial-slider"
            />
          </div>

          {/* Universe Scale */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">Universe Scale</span>
              <span className="font-mono text-cyan-300">{tuning.globalScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.05"
              value={tuning.globalScale}
              onChange={(e) => onUpdateTuning({ globalScale: parseFloat(e.target.value) })}
              className="spatial-slider"
            />
          </div>
        </div>

        {/* Section: Optics & Post-Processing */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visual Optics</span>
          </h4>

          {/* Particle Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">Particle Point Size</span>
              <span className="font-mono text-fuchsia-300">{tuning.particleSize.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="3.5"
              step="0.1"
              value={tuning.particleSize}
              onChange={(e) => onUpdateTuning({ particleSize: parseFloat(e.target.value) })}
              className="spatial-slider"
            />
          </div>

          {/* Bloom Intensity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/70">Volumetric Bloom Glow</span>
              <span className="font-mono text-fuchsia-300">{tuning.bloomStrength.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.5"
              step="0.05"
              value={tuning.bloomStrength}
              onChange={(e) => onUpdateTuning({ bloomStrength: parseFloat(e.target.value) })}
              className="spatial-slider"
            />
          </div>
        </div>

        {/* Action Triggers */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onTriggerBurst}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 hover:from-cyan-500/40 hover:to-fuchsia-500/40 border border-cyan-400/30 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>Trigger Kinetic Shockwave</span>
          </button>

          <button
            onClick={onResetScale}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Scale & Physics</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-4 border-t border-white/10 text-[11px] text-white/40 text-center">
          WebGL2 GPGPU Float32 Architecture • SPARVYOM
        </div>
      </aside>
    </>
  );
};
