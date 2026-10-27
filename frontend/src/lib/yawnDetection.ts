/**
 * Real-time Mouth Aspect Ratio (MAR) and duration-filtered yawn detection
 * for the browser client.
 */

import { type NormalizedLandmark } from "./landmarks";
import { euclideanDistance } from "./eyeAnalysis";

export interface YawnTrackerConfig {
  marThreshold?: number;
  yawnDurationSec?: number;
}

export interface YawnMetrics {
  mar: number;
  isMouthOpen: boolean;
  openDurationSec: number;
  isYawning: boolean;
  yawnCount: number;
  marThreshold: number;
  progressToYawn: number; // 0 to 100%
}

// Canonical 6 points for mouth aspect ratio
export const MOUTH_6_POINTS = [61, 37, 267, 291, 314, 84] as const;
export const INNER_LIP_TOP = 13;
export const INNER_LIP_BOTTOM = 14;

/**
 * Calculate Mouth Aspect Ratio (MAR).
 *
 * MAR = (||p2 - p6|| + ||p3 - p5|| + ||p_inner_top - p_inner_bottom||) / (2.5 * ||p1 - p4||)
 */
export function calculateMAR(landmarks: NormalizedLandmark[]): number {
  const [p1Idx, p2Idx, p3Idx, p4Idx, p5Idx, p6Idx] = MOUTH_6_POINTS;

  if (
    !landmarks[p1Idx] ||
    !landmarks[p2Idx] ||
    !landmarks[p3Idx] ||
    !landmarks[p4Idx] ||
    !landmarks[p5Idx] ||
    !landmarks[p6Idx]
  ) {
    return 0.0;
  }

  const p1 = landmarks[p1Idx];
  const p2 = landmarks[p2Idx];
  const p3 = landmarks[p3Idx];
  const p4 = landmarks[p4Idx];
  const p5 = landmarks[p5Idx];
  const p6 = landmarks[p6Idx];

  const distV1 = euclideanDistance(p2, p6);
  const distV2 = euclideanDistance(p3, p5);
  const distH = euclideanDistance(p1, p4);

  if (distH <= 1e-6) return 0.0;

  if (landmarks[INNER_LIP_TOP] && landmarks[INNER_LIP_BOTTOM]) {
    const distVInner = euclideanDistance(
      landmarks[INNER_LIP_TOP],
      landmarks[INNER_LIP_BOTTOM]
    );
    return (distV1 + distV2 + distVInner) / (2.5 * distH);
  }

  return (distV1 + distV2) / (2.0 * distH);
}

/**
 * Stateful yawn tracker with a 1.5s duration filter to exclude conversation.
 */
export class YawnTracker {
  private readonly marThreshold: number;
  private readonly yawnDurationSec: number;

  private yawnCount: number = 0;
  private mouthOpenStartTime: number | null = null;
  private currentOpenDuration: number = 0.0;
  private yawnCountedForCurrentEpisode: boolean = false;

  constructor(config: YawnTrackerConfig = {}) {
    this.marThreshold = config.marThreshold ?? 0.60;
    this.yawnDurationSec = config.yawnDurationSec ?? 1.5;
  }

  public reset(): void {
    this.yawnCount = 0;
    this.mouthOpenStartTime = null;
    this.currentOpenDuration = 0.0;
    this.yawnCountedForCurrentEpisode = false;
  }

  /**
   * Process a single video frame.
   *
   * @param landmarks - 468 or 478 face landmarks
   * @param timestampSec - Monotonic timestamp in seconds
   */
  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampSec: number
  ): YawnMetrics {
    if (landmarks.length < 468) {
      return this.emptyMetrics();
    }

    const mar = calculateMAR(landmarks);
    const isMouthOpen = mar >= this.marThreshold;

    if (isMouthOpen) {
      if (this.mouthOpenStartTime === null) {
        this.mouthOpenStartTime = timestampSec;
      }
      this.currentOpenDuration = Math.max(0, timestampSec - this.mouthOpenStartTime);

      // Trigger yawn only after duration filter is satisfied
      if (this.currentOpenDuration >= this.yawnDurationSec) {
        if (!this.yawnCountedForCurrentEpisode) {
          this.yawnCount++;
          this.yawnCountedForCurrentEpisode = true;
        }
      }
    } else {
      // Mouth closed below threshold -> Reset episode
      this.mouthOpenStartTime = null;
      this.currentOpenDuration = 0.0;
      this.yawnCountedForCurrentEpisode = false;
    }

    const isYawning = this.currentOpenDuration >= this.yawnDurationSec;
    const progressToYawn = isMouthOpen
      ? Math.min(100, Math.round((this.currentOpenDuration / this.yawnDurationSec) * 100))
      : 0;

    return {
      mar: Math.round(mar * 1000) / 1000,
      isMouthOpen,
      openDurationSec: Math.round(this.currentOpenDuration * 100) / 100,
      isYawning,
      yawnCount: this.yawnCount,
      marThreshold: this.marThreshold,
      progressToYawn,
    };
  }

  private emptyMetrics(): YawnMetrics {
    return {
      mar: 0,
      isMouthOpen: false,
      openDurationSec: 0,
      isYawning: false,
      yawnCount: this.yawnCount,
      marThreshold: this.marThreshold,
      progressToYawn: 0,
    };
  }
}
