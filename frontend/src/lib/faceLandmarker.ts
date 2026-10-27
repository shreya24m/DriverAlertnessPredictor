/**
 * MediaPipe FaceLandmarker singleton manager and video inference helper.
 */

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { type DetectionResult, type NormalizedLandmark } from "./landmarks";

let faceLandmarkerInstance: FaceLandmarker | null = null;
let isInitializing = false;
let initPromise: Promise<FaceLandmarker | null> | null = null;

/**
 * Initialize or retrieve the singleton FaceLandmarker instance.
 * Automatically tries local public assets first with CDN fallbacks.
 */
export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // 1. Resolve WASM assets (try local first, then jsdelivr CDN fallback)
      let visionResolver;
      try {
        visionResolver = await FilesetResolver.forVisionTasks("/wasm");
      } catch {
        visionResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
      }

      // 2. Model path (try local model first, then Google Cloud Storage fallback)
      const modelPath = "/models/face_landmarker.task";
      const fallbackModelPath =
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

      // 3. Create FaceLandmarker with GPU delegate (falling back to CPU if WebGL fails)
      try {
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(
          visionResolver,
          {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          }
        );
      } catch {
        // Fallback to CPU or remote model asset if local GPU fails
        try {
          faceLandmarkerInstance = await FaceLandmarker.createFromOptions(
            visionResolver,
            {
              baseOptions: {
                modelAssetPath: fallbackModelPath,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numFaces: 1,
            }
          );
        } catch {
          // Final fallback with local model on CPU
          faceLandmarkerInstance = await FaceLandmarker.createFromOptions(
            visionResolver,
            {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numFaces: 1,
            }
          );
        }
      }

      return faceLandmarkerInstance;
    } catch (error) {
      console.error("Failed to initialize MediaPipe FaceLandmarker:", error);
      return null;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Execute real-time face landmark inference on a video frame.
 *
 * @param landmarker - Active FaceLandmarker instance
 * @param video - Video element containing current camera stream
 * @param timestampMs - Monotonic timestamp in milliseconds
 * @returns DetectionResult containing landmarks and face presence status
 */
export function detectLandmarksForVideo(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): DetectionResult {
  if (
    !video ||
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return { landmarks: [], hasFace: false, timestamp: timestampMs };
  }

  try {
    const result: FaceLandmarkerResult = landmarker.detectForVideo(
      video,
      timestampMs
    );

    if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
      const rawLandmarks = result.faceLandmarks[0];
      const normalized: NormalizedLandmark[] = rawLandmarks.map((pt) => ({
        x: pt.x,
        y: pt.y,
        z: pt.z,
        visibility: pt.visibility,
      }));

      return {
        landmarks: normalized,
        hasFace: true,
        timestamp: timestampMs,
      };
    }
  } catch (err) {
    // MediaPipe can throw if timestamp is non-monotonic; catch and skip frame
    console.debug("Landmark detection frame skipped:", err);
  }

  return {
    landmarks: [],
    hasFace: false,
    timestamp: timestampMs,
  };
}
