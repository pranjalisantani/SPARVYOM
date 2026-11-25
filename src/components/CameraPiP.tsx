import React, { useRef, useEffect, useState } from 'react';
import { HandData } from '../types/gestures';
import { ChevronDown, ChevronUp, EyeOff, Radio } from 'lucide-react';

interface CameraPiPProps {
  videoElement: HTMLVideoElement | null;
  hands: HandData[];
  isStreaming: boolean;
  onToggleCamera: () => void;
}

// MediaPipe hand skeletal connections (pairs of landmark indices)
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],        // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],        // Index
  [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                                // Palm base
];

export const CameraPiP: React.FC<CameraPiPProps> = ({
  videoElement,
  hands,
  isStreaming,
  onToggleCamera
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Render Skeletal Cyber Overlay on Canvas (Fast 2-pass hardware accelerated stroke, no CPU shadowBlur)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hands && hands.length > 0) {
      hands.forEach((hand) => {
        const lms = hand.landmarks;
        if (!lms || lms.length < 21) return;

        const isSpecial = hand.isPinching || hand.isThumbsUp;
        const glowColor = isSpecial ? 'rgba(92, 217, 255, 0.45)' : 'rgba(44, 113, 155, 0.4)';
        const coreColor = isSpecial ? '#C4F4FF' : '#5CD9FF';

        // 1. Soft cyber-glow outer pass (Hardware accelerated)
        ctx.lineWidth = 4.0;
        ctx.strokeStyle = glowColor;

        CONNECTIONS.forEach(([start, end]) => {
          const p1 = lms[start];
          const p2 = lms[end];
          const x1 = (1.0 - p1.x) * canvas.width;
          const y1 = p1.y * canvas.height;
          const x2 = (1.0 - p2.x) * canvas.width;
          const y2 = p2.y * canvas.height;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });

        // 2. Crisp bright core pass
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = coreColor;

        CONNECTIONS.forEach(([start, end]) => {
          const p1 = lms[start];
          const p2 = lms[end];
          const x1 = (1.0 - p1.x) * canvas.width;
          const y1 = p1.y * canvas.height;
          const x2 = (1.0 - p2.x) * canvas.width;
          const y2 = p2.y * canvas.height;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });

        // 3. Draw Glowing Keypoint Joints
        lms.forEach((lm, idx) => {
          const x = (1.0 - lm.x) * canvas.width;
          const y = lm.y * canvas.height;
          const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;

          // Outer halo
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? 'rgba(196, 244, 255, 0.45)' : 'rgba(92, 217, 255, 0.3)';
          ctx.fill();

          // Inner core
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 2.5 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? '#C4F4FF' : '#5CD9FF';
          ctx.fill();
        });
      });
    }
  }, [hands]);

  // Mount/Unmount video DOM attachment into preview container
  useEffect(() => {
    const container = containerRef.current;
    if (container && videoElement) {
      videoElement.className = 'w-full h-full object-cover scale-x-[-1] opacity-75';
      if (!container.contains(videoElement)) {
        container.appendChild(videoElement);
      }
    }
  }, [videoElement]);

  if (!isStreaming) return null;

  return (
    <div className="cyber-pip">
      {/* Cyberpunk Decorative Corner Brackets */}
      <div className="cyber-corner-tl" />
      <div className="cyber-corner-tr" />
      <div className="cyber-corner-bl" />
      <div className="cyber-corner-br" />

      {/* Cyber Header Bar */}
      <div className="cyber-pip-header">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-wider uppercase text-white/90">
            {hands.length > 0 ? `TRACKING (${hands.length})` : 'SEEKING HANDS'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-white/60 hover:text-white rounded hover:bg-white/10 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleCamera}
            className="p-1 text-white/60 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Disconnect Camera"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video & Skeleton Viewport */}
      {!isMinimized && (
        <div className="relative w-full aspect-[4/3] bg-black/90 overflow-hidden">
          {/* Native Video Feed Container */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* Skeleton Canvas Overlay */}
          <canvas
            ref={canvasRef}
            width={250}
            height={188}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Active Gesture Tag */}
          {hands[0] && hands[0].gesture !== 'none' && (
            <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-400/50 text-[10px] font-mono text-cyan-300 uppercase tracking-wider shadow-lg">
              {hands[0].gesture.replace('_', ' ')}
            </div>
          )}

          {/* Tracking Subtitle */}
          <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-white/40 tracking-widest uppercase">
            60FPS • GPU DELEGATE
          </div>
        </div>
      )}
    </div>
  );
};
