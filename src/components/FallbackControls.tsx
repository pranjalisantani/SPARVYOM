import React from 'react';
import { X, Hand, Keyboard, Sparkles } from 'lucide-react';

interface FallbackControlsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FallbackControls: React.FC<FallbackControlsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl select-none animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold font-heading text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>Spatial Interaction Guide</span>
        </h3>
        <p className="text-xs text-white/50 mb-6">Master hand tracking gestures and keyboard shortcuts in SPARVYOM</p>

        {/* Hand Gestures Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Hand className="w-4 h-4" />
            <span>Physical Hand Gestures (Webcam)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">👌 Pinch (Thumb + Index)</span>
              <span className="text-white/60">Hold pinch for 350ms to cycle to the next cosmic formation.</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">👍 Thumbs Up</span>
              <span className="text-white/60">Anchor gesture: confirms state and snaps to Saturn / Solar Star.</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">🖐️ Open Palm</span>
              <span className="text-white/60">Repulsor field: pushes and scatters particles away from palm center.</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">✊ Cupped Fist</span>
              <span className="text-white/60">Attractor field: pulls particles inward into a dense gravitational core.</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">👐 Two-Hand Span</span>
              <span className="text-white/60">Move hands apart to expand universe scale; pull together to compress.</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-semibold text-white block mb-0.5">🫶 Bimanual Framing</span>
              <span className="text-white/60">Frame both hands inward to morph into the 3D Cosmic Heart.</span>
            </div>
          </div>
        </div>

        {/* Mouse & Keyboard Section */}
        <div>
          <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Keyboard className="w-4 h-4" />
            <span>Mouse & Keyboard Fallback</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Click & Drag</span>
              <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">Gravity Attractor</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Move Mouse</span>
              <span className="font-mono text-fuchsia-300 bg-fuchsia-950/60 px-2 py-0.5 rounded border border-fuchsia-800">Repulsor & Parallax</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Scroll Wheel</span>
              <span className="font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Scale Universe</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Keys 1 to 7</span>
              <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">Jump to Universe</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Spacebar</span>
              <span className="font-mono text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800">Shockwave Burst</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/80">Key H</span>
              <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">Zen / Cinema Mode</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
