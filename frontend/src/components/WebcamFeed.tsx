"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useWebcam } from "@/hooks/useWebcam";
import { getFaceLandmarker, detectLandmarksForVideo } from "@/lib/faceLandmarker";
import { drawLandmarkOverlay, type OverlayMode } from "@/lib/canvasOverlay";
import { type NormalizedLandmark } from "@/lib/landmarks";
import { type FaceLandmarker } from "@mediapipe/tasks-vision";
import { EyeTracker, type EyeMetrics } from "@/lib/eyeAnalysis";
import { YawnTracker, type YawnMetrics } from "@/lib/yawnDetection";

export interface WebcamFeedProps {
  onLandmarksUpdate?: (landmarks: NormalizedLandmark[], hasFace: boolean) => void;
  onEyeMetricsUpdate?: (metrics: EyeMetrics | null) => void;
  onYawnMetricsUpdate?: (metrics: YawnMetrics | null) => void;
  className?: string;
}

export function WebcamFeed({
  onLandmarksUpdate,
  onEyeMetricsUpdate,
  onYawnMetricsUpdate,
  className = "",
}: WebcamFeedProps) {
  const {
    videoRef,
    isStreaming,
    isLoading: isWebcamLoading,
    error: webcamError,
    permissionDenied,
    devices,
    selectedDeviceId,
    start,
    stop,
    switchCamera,
  } = useWebcam({ width: 640, height: 480, frameRate: 30, autoStart: false });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const eyeTrackerRef = useRef<EyeTracker>(new EyeTracker());
  const yawnTrackerRef = useRef<YawnTracker>(new YawnTracker());
  const animationFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // FPS tracking refs
  const frameTimestampsRef = useRef<number[]>([]);
  const [fps, setFps] = useState<number>(0);

  // Component state
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [hasFace, setHasFace] = useState<boolean>(false);
  const [landmarksCount, setLandmarksCount] = useState<number>(0);
  const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics | null>(null);
  const [yawnMetrics, setYawnMetrics] = useState<YawnMetrics | null>(null);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("full");
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // 1. Initialize FaceLandmarker on mount
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      setIsModelLoading(true);
      setModelError(null);
      try {
        const landmarker = await getFaceLandmarker();
        if (isCancelled) return;
        if (!landmarker) {
          setModelError("Failed to initialize MediaPipe Face Landmarker.");
        } else {
          landmarkerRef.current = landmarker;
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setModelError(
            err instanceof Error ? err.message : "Error loading face vision model"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsModelLoading(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Rolling FPS calculation
  const updateFps = useCallback((now: number) => {
    const timestamps = frameTimestampsRef.current;
    timestamps.push(now);

    // Keep only timestamps from the last 1000ms
    const oneSecAgo = now - 1000;
    while (timestamps.length > 0 && timestamps[0] < oneSecAgo) {
      timestamps.shift();
    }

    if (timestamps.length > 1) {
      const calculatedFps = Math.round(
        ((timestamps.length - 1) * 1000) / (now - timestamps[0])
      );
      setFps(calculatedFps);
    }
  }, []);

  const callbacksRef = useRef({
    onLandmarksUpdate,
    onEyeMetricsUpdate,
    onYawnMetricsUpdate,
  });
  useEffect(() => {
    callbacksRef.current = {
      onLandmarksUpdate,
      onEyeMetricsUpdate,
      onYawnMetricsUpdate,
    };
  }, [onLandmarksUpdate, onEyeMetricsUpdate, onYawnMetricsUpdate]);

  // 3. Main real-time detection and rendering loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (
      video &&
      canvas &&
      landmarker &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      !video.paused &&
      !video.ended
    ) {
      // Sync canvas dimensions with video stream
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const now = performance.now();
      // MediaPipe requires strictly increasing timestamps
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const result = detectLandmarksForVideo(landmarker, video, now);

        setHasFace(result.hasFace);
        setLandmarksCount(result.landmarks.length);
        callbacksRef.current.onLandmarksUpdate?.(result.landmarks, result.hasFace);

        // Calculate Eye Metrics (EAR, Blinks, PERCLOS)
        let metrics: EyeMetrics | null = null;
        let yawn: YawnMetrics | null = null;

        if (result.hasFace && result.landmarks.length >= 468) {
          const timestampSec = now / 1000.0;
          metrics = eyeTrackerRef.current.processFrame(
            result.landmarks,
            timestampSec
          );
          yawn = yawnTrackerRef.current.processFrame(
            result.landmarks,
            timestampSec
          );
        }

        setEyeMetrics(metrics);
        setYawnMetrics(yawn);
        callbacksRef.current.onEyeMetricsUpdate?.(metrics);
        callbacksRef.current.onYawnMetricsUpdate?.(yawn);

        // Draw HUD overlay
        drawLandmarkOverlay(canvas, {
          landmarks: result.landmarks,
          hasFace: result.hasFace,
          mode: overlayMode,
          mirrored: isMirrored,
          eyeMetrics: metrics,
          yawnMetrics: yawn,
        });

        updateFps(now);
      }
    } else if (canvas && !isStreaming) {
      // Clear canvas if video is not streaming
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasFace(false);
      setEyeMetrics(null);
      setYawnMetrics(null);
      callbacksRef.current.onEyeMetricsUpdate?.(null);
      callbacksRef.current.onYawnMetricsUpdate?.(null);
      setFps(0);
    }

    if (isStreaming) {
      animationFrameIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [
    isStreaming,
    overlayMode,
    isMirrored,
    updateFps,
    videoRef,
  ]);

  // 4. Start / Stop loop according to streaming state
  useEffect(() => {
    if (isStreaming) {
      animationFrameIdRef.current = requestAnimationFrame(processFrame);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      setFps(0);
      setHasFace(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isStreaming, processFrame]);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Top Header / Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-3 gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isStreaming
                ? hasFace
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
            {isStreaming
              ? hasFace
                ? `Face Detected (${landmarksCount} pts)`
                : "Searching for Face..."
              : "Camera Standby"}
          </span>
        </div>

        {/* Real-time FPS Counter Badge */}
        <div className="flex items-center gap-2">
          {isStreaming && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${
                fps >= 24
                  ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                  : fps >= 15
                  ? "bg-cyan-950/60 border-cyan-500/30 text-cyan-400"
                  : "bg-amber-950/60 border-amber-500/30 text-amber-400"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span>{fps} FPS</span>
            </div>
          )}

          {/* Model status indicator */}
          {isModelLoading && (
            <span className="text-xs text-cyan-400 animate-pulse font-mono">
              Loading MediaPipe...
            </span>
          )}
        </div>
      </div>

      {/* Video & Canvas Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Underlying HTML5 Video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover transition-transform duration-200 ${
            isMirrored ? "scale-x-[-1]" : ""
          } ${isStreaming ? "block" : "hidden"}`}
        />

        {/* Real-time Canvas Landmark Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full pointer-events-none object-cover ${
            isStreaming ? "block" : "hidden"
          }`}
        />

        {/* State: Camera Inactive / Standby */}
        {!isStreaming && !permissionDenied && !webcamError && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
              📷
            </div>
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                Driver Vision Monitoring Inactive
              </p>
              <p className="text-xs text-slate-400">
                Start the camera to begin real-time MediaPipe face mesh tracking
                directly in your browser.
              </p>
            </div>
            <button
              onClick={() => start()}
              disabled={isWebcamLoading || isModelLoading}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {isWebcamLoading ? "Accessing Camera..." : "Start Camera Feed"}
            </button>
          </div>
        )}

        {/* State: Permission Denied Graceful Handler */}
        {permissionDenied && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md">
            <div className="h-14 w-14 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl">
              🚫
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-400">
                Camera Access Blocked
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                DriveAware AI processes facial landmarks entirely in your
                browser for privacy. Please grant camera permission in your
                browser's address bar to continue.
              </p>
            </div>
            <button
              onClick={() => start()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {/* State: Other Webcam or Model Errors */}
        {!permissionDenied && (webcamError || modelError) && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 max-w-md">
            <div className="text-amber-400 text-2xl">⚠️</div>
            <p className="text-xs font-medium text-amber-400">
              {webcamError || modelError}
            </p>
            <button
              onClick={() => start()}
              className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* In-feed "No Face Detected" Warning Pill */}
        {isStreaming && !hasFace && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-950/80 border border-amber-500/40 px-3.5 py-1 text-[11px] font-medium text-amber-300 shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-bounce">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            No Face Detected &bull; Center your face
          </div>
        )}
      </div>

      {/* Bottom Interactive Control Panel */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 gap-3">
        {/* Play/Stop Toggle */}
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-sm"
            >
              <span>⏹</span> Stop Camera
            </button>
          ) : (
            <button
              onClick={() => start()}
              disabled={isWebcamLoading || isModelLoading}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-sm disabled:opacity-50"
            >
              <span>▶</span> Start Camera
            </button>
          )}

          {/* Mirror toggle */}
          <button
            onClick={() => setIsMirrored((prev) => !prev)}
            title="Toggle horizontal mirror"
            className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
              isMirrored
                ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            🪞 {isMirrored ? "Mirrored" : "Normal"}
          </button>

          {/* Recalibrate button */}
          {isStreaming && (
            <button
              onClick={() => eyeTrackerRef.current.recalibrate()}
              title="Reset baseline EAR calibration"
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              🔄 Recalibrate
            </button>
          )}
        </div>

        {/* Overlay Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Overlay:</span>
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
            <button
              onClick={() => setOverlayMode("full")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                overlayMode === "full"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Full Mesh
            </button>
            <button
              onClick={() => setOverlayMode("features")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                overlayMode === "features"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Eyes &amp; Mouth
            </button>
            <button
              onClick={() => setOverlayMode("off")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                overlayMode === "off"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Multi-device selector (if >1 cameras) */}
        {devices.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => switchCamera(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
