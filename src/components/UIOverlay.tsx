import React from 'react';
import { ShapeType } from '../types/simulation';
import { InteractionMode, HandData } from '../types/gestures';
import { SHAPE_DEFINITIONS, SHAPE_SEQUENCE } from '../config/palettes';
import {
  Sparkles,
  VolumeX,
  Camera,
  CameraOff,
  HelpCircle,
  Maximize2,
  Sliders,
  Eye,
  Sun,
  Disc,
  Orbit,
  Heart,
  Waves,
  Cloud,
  Layers
} from 'lucide-react';

interface UIOverlayProps {
  currentShape: ShapeType;
  interactionMode: InteractionMode;
  fps: number;
  particleCount: number;
  isAudioMuted: boolean;
  isCameraActive: boolean;
  isCameraStarting?: boolean;
  isZenMode: boolean;
  detectedHands: HandData[];
  onSelectShape: (shape: ShapeType) => void;
  onToggleAudio: () => void;
  onToggleCamera: () => void;
  onToggleZenMode: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

// Icon mapping for each formation
const SHAPE_ICONS: Record<ShapeType, React.ReactNode> = {
  sun: <Sun className="w-3.5 h-3.5" />,
  saturn: <Disc className="w-3.5 h-3.5" />,
  galaxy: <Orbit className="w-3.5 h-3.5" />,
  heart: <Heart className="w-3.5 h-3.5" />,
  wave: <Waves className="w-3.5 h-3.5" />,
  ribbon: <Layers className="w-3.5 h-3.5" />,
  nebula: <Cloud className="w-3.5 h-3.5" />
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  currentShape,
  interactionMode,
  fps,
  particleCount,
  isAudioMuted,
  isCameraActive,
  isCameraStarting,
  isZenMode,
  detectedHands,
  onSelectShape,
  onToggleAudio,
  onToggleCamera,
  onToggleZenMode,
  onOpenSettings,
  onOpenHelp
}) => {
  const activeDef = SHAPE_DEFINITIONS[currentShape];
  const primaryHand = detectedHands[0];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // If in Zen Mode, only render minimal floating exit pill
  if (isZenMode) {
    return (
      <div
        onClick={onToggleZenMode}
        className="zen-pill pointer-events-auto"
        title="Exit Zen Mode (or press 'H')"
      >
        <Eye className="w-3.5 h-3.5 text-cyan-400" />
        <span>Zen Mode Active • Press <strong>H</strong> to restore UI</span>
      </div>
    );
  }

  return (
    <>
      {/* 1. Top Spatial Island Header */}
      <header className="spatial-island">
        {/* Brand Capsule */}
        <div className="brand-capsule">
          <div className="brand-glyph">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="brand-title">
              <span>SPARVYOM</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10">
                {particleCount.toLocaleString()} • {fps} FPS
              </span>
            </div>
            <p className="brand-subtitle">One Continuous Particle Simulation</p>
          </div>
        </div>

        {/* Center Hologram Gesture & Status Capsule */}
        <div className="status-capsule hidden md:flex">
          {isCameraStarting ? (
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Starting camera & neural vision...</span>
            </div>
          ) : detectedHands.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="status-badge">
                <span className="status-dot" />
                <span className="text-white/90">
                  {detectedHands.length === 2 ? '👐 Dual Hands (Scale Field)' : '✋ Hand Tracking Live'}
                </span>
              </div>

              {primaryHand && primaryHand.gesture !== 'none' && (
                <>
                  <div className="h-3 w-[1px] bg-white/20" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    {primaryHand.gesture.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
          ) : isCameraActive ? (
            <div className="flex items-center gap-2 text-xs text-cyan-200">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Camera Active • Show hands to interact (Open palm = Push)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse" />
              <span>Mouse Gravitational Attractor • Drag to pull</span>
            </div>
          )}
        </div>

        {/* Controls Action Cluster */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Audio Equalizer Button */}
          <button
            onClick={onToggleAudio}
            className={`glass-button p-2.5 ${!isAudioMuted ? 'active' : ''}`}
            title={isAudioMuted ? 'Enable Ambient Audio' : 'Mute Audio'}
          >
            {!isAudioMuted ? (
              <div className="equalizer-bars">
                <span className="equalizer-bar" />
                <span className="equalizer-bar" />
                <span className="equalizer-bar" />
                <span className="equalizer-bar" />
              </div>
            ) : (
              <VolumeX className="w-4 h-4 text-white/70" />
            )}
          </button>

          {/* Camera Stream Toggle */}
          <button
            onClick={onToggleCamera}
            className={`glass-button p-2.5 ${isCameraActive ? 'active' : ''}`}
            title={isCameraActive ? 'Disable Gesture Camera' : 'Enable Gesture Camera'}
          >
            {isCameraActive ? (
              <Camera className="w-4 h-4 text-cyan-300" />
            ) : (
              <CameraOff className="w-4 h-4 text-white/70" />
            )}
          </button>

          {/* Spatial Tuning Settings Drawer */}
          <button
            onClick={onOpenSettings}
            className="glass-button p-2.5"
            title="Open Spatial Physics Tuning"
          >
            <Sliders className="w-4 h-4 text-white/70" />
          </button>

          {/* Zen Cinema Mode Toggle */}
          <button
            onClick={onToggleZenMode}
            className="glass-button p-2.5"
            title="Zen Cinema Mode (Hide UI) [Press 'H']"
          >
            <Eye className="w-4 h-4 text-white/70" />
          </button>

          {/* Help & Gesture Cheatsheet */}
          <button
            onClick={onOpenHelp}
            className="glass-button p-2.5"
            title="Keyboard & Gesture Guide [?]"
          >
            <HelpCircle className="w-4 h-4 text-white/70" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="glass-button p-2.5"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </header>

      {/* 2. Middle Mode Banner (Temporary Alert when Hand Engages Force Field) */}
      {interactionMode !== 'idle' && (
        <div className="fixed top-24 left-50% transform -translate-x-1/2 z-30 pointer-events-none animate-fade-in">
          <div className="px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 backdrop-blur-xl shadow-2xl flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Force Field: {interactionMode}</span>
          </div>
        </div>
      )}

      {/* 3. Bottom Floating Formation Dock */}
      <footer className="formation-dock-container">
        {/* Active Universe Description Banner */}
        <div className="universe-banner">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-lg"
            style={{
              backgroundColor: `#${activeDef.palette.primary.getHexString()}`,
              boxShadow: `0 0 10px #${activeDef.palette.primary.getHexString()}`
            }}
          />
          <strong className="text-white font-medium">{activeDef.name}</strong>
          <span className="text-white/40">•</span>
          <span className="text-white/75">{activeDef.subtitle}</span>
        </div>

        {/* Formation Dock Pills */}
        <div className="formation-dock">
          {SHAPE_SEQUENCE.map((shape, idx) => {
            const def = SHAPE_DEFINITIONS[shape];
            const isSelected = shape === currentShape;
            return (
              <button
                key={shape}
                onClick={() => onSelectShape(shape)}
                className={`dock-item ${isSelected ? 'active' : ''}`}
                title={`${def.name} - ${def.subtitle} [Key ${idx + 1}]`}
              >
                <span className="text-white/80">{SHAPE_ICONS[shape]}</span>
                <span>{def.name}</span>
                <span className="dock-hotkey">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </>
  );
};
