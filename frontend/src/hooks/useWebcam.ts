"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface UseWebcamOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: "user" | "environment";
  autoStart?: boolean;
}

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  start: (deviceId?: string) => Promise<boolean>;
  stop: () => void;
  switchCamera: (deviceId: string) => Promise<boolean>;
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const {
    width = 640,
    height = 480,
    frameRate = 30,
    facingMode = "user",
    autoStart = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Enumerate connected video inputs
  const enumerateDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch {
      // Ignore enumeration errors prior to permission grant
    }
  }, [selectedDeviceId]);

  // Stop active stream tracks safely
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  // Request media stream and attach to video element
  const start = useCallback(
    async (deviceId?: string): Promise<boolean> => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Browser does not support mediaDevices.getUserMedia");
        return false;
      }

      setIsLoading(true);
      setError(null);
      setPermissionDenied(false);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const targetDeviceId = deviceId || selectedDeviceId;

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: targetDeviceId
          ? {
              deviceId: { exact: targetDeviceId },
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: frameRate, max: 60 },
            }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: width },
              height: { ideal: height },
              frameRate: { ideal: frameRate, max: 60 },
            },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.playsInline = true;
          videoRef.current.muted = true;

          // Wait until video data is loaded before confirming streaming state
          await new Promise<void>((resolve) => {
            if (!videoRef.current) return resolve();
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(resolve).catch(resolve);
            };
          });
        }

        setIsStreaming(true);
        setIsLoading(false);
        await enumerateDevices();
        return true;
      } catch (err: unknown) {
        setIsStreaming(false);
        setIsLoading(false);

        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setPermissionDenied(true);
            setError(
              "Camera permission was denied. Please allow camera access in your browser site settings."
            );
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setError("No video camera found on this device.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            setError(
              "Camera is currently in use by another application or blocked by system permissions."
            );
          } else if (err.name === "OverconstrainedError") {
            setError("Camera does not support the requested resolution or framerate.");
          } else {
            setError(`Webcam error (${err.name}): ${err.message}`);
          }
        } else {
          setError("Failed to access webcam. Please check your camera permissions.");
        }
        return false;
      }
    },
    [selectedDeviceId, width, height, frameRate, facingMode, enumerateDevices]
  );

  const switchCamera = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setSelectedDeviceId(deviceId);
      if (isStreaming) {
        return start(deviceId);
      }
      return true;
    },
    [isStreaming, start]
  );

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    videoRef,
    isStreaming,
    isLoading,
    error,
    permissionDenied,
    devices,
    selectedDeviceId,
    start,
    stop,
    switchCamera,
  };
}
