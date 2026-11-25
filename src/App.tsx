import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './rendering/SceneManager';
import { SoundManager } from './audio/SoundManager';
import { CameraManager } from './tracking/CameraManager';
import { HandTracker } from './tracking/HandTracker';
import { SimulationStateMachine } from './tracking/StateMachine';
import { ShapeType } from './types/simulation';
import { HandData, InteractionMode } from './types/gestures';
import { SHAPE_SEQUENCE } from './config/palettes';
import { DEFAULT_SIM_CONFIG } from './config/constants';
import { UIOverlay } from './components/UIOverlay';
import { CameraPiP } from './components/CameraPiP';
import { PermissionModal } from './components/PermissionModal';
import { FallbackControls } from './components/FallbackControls';
import { SettingsDrawer, TuningConfig } from './components/SettingsDrawer';
import { DevDiagnosticPanel } from './components/DevDiagnosticPanel';

export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Engine references
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const soundManagerRef = useRef<SoundManager>(new SoundManager());
  const cameraManagerRef = useRef<CameraManager>(new CameraManager());
  const handTrackerRef = useRef<HandTracker>(new HandTracker());
  const stateMachineRef = useRef<SimulationStateMachine>(new SimulationStateMachine());

  // React State for UI
  const [currentShape, setCurrentShape] = useState<ShapeType>('sun');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [fps, setFps] = useState<number>(60);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [detectedHands, setDetectedHands] = useState<HandData[]>([]);
  const [mediapipeStatus, setMediapipeStatus] = useState<'READY' | 'INITIALIZING' | 'ERROR' | 'STANDBY'>('STANDBY');

  // Spatial Tuning Parameters
  const [tuning, setTuning] = useState<TuningConfig>({
    particleSize: 1.8,
    bloomStrength: 0.40,
    curlStrength: 1.2,
    returnStrength: 2.8,
    globalScale: 1.0
  });

  // Initialize Three.js & Simulation Engine
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    soundManagerRef.current.init();

    const sceneManager = new SceneManager(
      canvasContainerRef.current,
      soundManagerRef.current
    );
    sceneManagerRef.current = sceneManager;

    sceneManager.setOnFpsUpdate((newFps) => setFps(newFps));

    // State machine listeners
    (window as any).__handTracker = handTrackerRef.current;
    (window as any).__cameraManager = cameraManagerRef.current;
    (window as any).__stateMachine = stateMachineRef.current;

    const unsubMorph = stateMachineRef.current.onMorph((shape) => {
      setCurrentShape(shape);
      sceneManager.morphToShape(shape);
    });

    const unsubMode = stateMachineRef.current.onMode((mode) => {
      setInteractionMode(mode);
    });

    return () => {
      unsubMorph();
      unsubMode();
      sceneManager.dispose();
    };
  }, []);

  // Hand tracking frame pump
  useEffect(() => {
    let animId: number;
    let lastUiTimestamp = 0;

    const trackingLoop = (timestamp: number) => {
      const video = cameraManagerRef.current.getVideoElement();
      if (isCameraActive && video && video.readyState >= 2) {
        const { hands, bimanual } = handTrackerRef.current.processVideoFrame(video, timestamp);

        // Update state machine & direct simulation forces on every tick for immediate responsiveness
        stateMachineRef.current.update(hands, bimanual, timestamp);
        const mode = stateMachineRef.current.getInteractionMode();
        const scale = stateMachineRef.current.getGlobalScale();
        sceneManagerRef.current?.setHandTrackingData(hands, mode, scale);

        // Throttle React state updates to ~15 FPS to avoid UI render thrashing
        if (timestamp - lastUiTimestamp > 66) {
          lastUiTimestamp = timestamp;
          setDetectedHands(hands);
        }
      }

      animId = requestAnimationFrame(trackingLoop);
    };

    animId = requestAnimationFrame(trackingLoop);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keys 1 to 7: Select shape directly
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= SHAPE_SEQUENCE.length) {
        const target = SHAPE_SEQUENCE[keyNum - 1];
        stateMachineRef.current.setShapeManually(target);
      }

      // Spacebar: Trigger kinetic shockwave burst
      if (e.code === 'Space') {
        e.preventDefault();
        sceneManagerRef.current?.triggerShockwave();
      }

      // 'M': Mute toggle
      if (e.key === 'm' || e.key === 'M') {
        handleToggleAudio();
      }

      // 'C': Camera toggle
      if (e.key === 'c' || e.key === 'C') {
        handleToggleCamera();
      }

      // 'H': Zen / Cinema Mode toggle
      if (e.key === 'h' || e.key === 'H') {
        setIsZenMode((prev) => !prev);
      }

      // '?': Help toggle
      if (e.key === '?') {
        setShowHelpModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectShape = useCallback((shape: ShapeType) => {
    stateMachineRef.current.setShapeManually(shape);
  }, []);

  const handleToggleAudio = useCallback(() => {
    soundManagerRef.current.init();
    const nextMuted = !isAudioMuted;
    soundManagerRef.current.setMuted(nextMuted);
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  const handleRequestCamera = useCallback(async (deviceId?: string): Promise<boolean> => {
    setIsCameraStarting(true);
    setMediapipeStatus('INITIALIZING');
    const success = await cameraManagerRef.current.startStream(deviceId);
    if (success) {
      const mpSuccess = await handTrackerRef.current.initialize();
      setMediapipeStatus(mpSuccess ? 'READY' : 'ERROR');
      setIsCameraActive(true);
      setShowPermissionModal(false);
      setCameraError(null);
    } else {
      setMediapipeStatus('ERROR');
      setCameraError(cameraManagerRef.current.getState().error || 'Permission denied.');
    }
    setIsCameraStarting(false);
    return success;
  }, []);

  const handleToggleCamera = useCallback(async () => {
    if (isCameraActive) {
      cameraManagerRef.current.stopStream();
      setIsCameraActive(false);
      setDetectedHands([]);
      setMediapipeStatus('STANDBY');
      sceneManagerRef.current?.setHandTrackingData([], 'idle', 1.0);
    } else {
      const success = await handleRequestCamera();
      if (!success) {
        setShowPermissionModal(true);
      }
    }
  }, [isCameraActive, handleRequestCamera]);

  const handleUpdateTuning = useCallback((newTuning: Partial<TuningConfig>) => {
    setTuning((prev) => {
      const updated = { ...prev, ...newTuning };
      sceneManagerRef.current?.updateTuning(updated);
      return updated;
    });
  }, []);

  const handleTriggerShockwave = useCallback(() => {
    sceneManagerRef.current?.triggerShockwave();
  }, []);

  const handleResetScale = useCallback(() => {
    const defaultTuning: TuningConfig = {
      particleSize: 1.8,
      bloomStrength: 0.40,
      curlStrength: 1.2,
      returnStrength: 2.8,
      globalScale: 1.0
    };
    setTuning(defaultTuning);
    stateMachineRef.current.setScaleManually(1.0);
    sceneManagerRef.current?.updateTuning(defaultTuning);
  }, []);

  return (
    <div className="relative w-screen h-screen w-full h-full overflow-hidden bg-[#06111D]">
      {/* Three.js Canvas Container */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0" />

      {/* Floating Spatial UI Overlay */}
      <UIOverlay
        currentShape={currentShape}
        interactionMode={interactionMode}
        fps={fps}
        particleCount={DEFAULT_SIM_CONFIG.particleCount}
        isAudioMuted={isAudioMuted}
        isCameraActive={isCameraActive}
        isCameraStarting={isCameraStarting}
        isZenMode={isZenMode}
        detectedHands={detectedHands}
        onSelectShape={handleSelectShape}
        onToggleAudio={handleToggleAudio}
        onToggleCamera={handleToggleCamera}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setShowHelpModal(true)}
      />

      {/* Spatial Physics Tuning Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tuning={tuning}
        onUpdateTuning={handleUpdateTuning}
        onTriggerBurst={handleTriggerShockwave}
        onResetScale={handleResetScale}
        fps={fps}
        particleCount={DEFAULT_SIM_CONFIG.particleCount}
      />

      {/* Webcam Picture-in-Picture & Skeleton Canvas */}
      {!isZenMode && (
        <CameraPiP
          videoElement={cameraManagerRef.current.getVideoElement()}
          hands={detectedHands}
          isStreaming={isCameraActive}
          onToggleCamera={handleToggleCamera}
        />
      )}

      {/* Camera Onboarding / Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        devices={cameraManagerRef.current.getState().availableDevices}
        error={cameraError}
        onRequestCamera={handleRequestCamera}
        onContinueWithoutCamera={() => setShowPermissionModal(false)}
      />

      {/* Development Telemetry & Diagnostic Panel */}
      {!isZenMode && (
        <DevDiagnosticPanel
          cameraReady={isCameraActive}
          videoResolution={
            isCameraActive && cameraManagerRef.current.getVideoElement()
              ? `${cameraManagerRef.current.getVideoElement()?.videoWidth || 640}x${
                  cameraManagerRef.current.getVideoElement()?.videoHeight || 480
                }`
              : 'N/A'
          }
          videoFrameStatus={
            isCameraActive
              ? cameraManagerRef.current.getVideoElement() &&
                cameraManagerRef.current.getVideoElement()!.readyState >= 2
                ? 'PLAYING'
                : 'BUFFERING'
              : 'OFFLINE'
          }
          mediapipeStatus={mediapipeStatus}
          handsDetected={detectedHands.length}
          currentGesture={
            detectedHands[0]?.gesture !== 'none'
              ? detectedHands[0]?.gesture
              : interactionMode !== 'idle'
              ? interactionMode
              : 'NONE'
          }
          fps={fps}
        />
      )}

      {/* Interaction & Fallback Help Drawer */}
      <FallbackControls
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};
