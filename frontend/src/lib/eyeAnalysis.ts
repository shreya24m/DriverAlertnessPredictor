/**
 * Real-time Eye Aspect Ratio (EAR), blink counter, closure duration,
 * and rolling PERCLOS calculation for browser client.
 */

import {
  type NormalizedLandmark,
  LEFT_EYE_EAR_INDICES,
  RIGHT_EYE_EAR_INDICES,
} from "./landmarks";

export interface EyeTrackerConfig {
  earThreshold?: number;
  blinkMinFrames?: number;
  blinkMaxFrames?: number;
  drowsyClosureSec?: number;
  perclosWindowSec?: number;
  calibrationDurationSec?: number;
}

export interface EyeMetrics {
  leftEar: number;
  rightEar: number;
  avgEar: number;
  isClosed: boolean;
  closureDurationSec: number;
  isDrowsyClosure: boolean;
  blinkCount: number;
  perclos: number;
  isCalibrated: boolean;
  calibrationProgress: number; // 0 to 100%
  baselineEar: number;
  earThreshold: number;
}

/**
 * 3D Euclidean distance between two landmarks.
 */
export function euclideanDistance(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute Eye Aspect Ratio (EAR) from 6 canonical landmarks.
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(
  landmarks: NormalizedLandmark[],
  indices: readonly [number, number, number, number, number, number]
): number {
  const [p1Idx, p2Idx, p3Idx, p4Idx, p5Idx, p6Idx] = indices;

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

  return (distV1 + distV2) / (2.0 * distH);
}

/**
 * Stateful eye vigilance tracker.
 */
export class EyeTracker {
  private earThreshold: number;
  private readonly blinkMinFrames: number;
  private readonly blinkMaxFrames: number;
  private readonly drowsyClosureSec: number;
  private readonly perclosWindowSec: number;
  private readonly calibrationDurationSec: number;

  private blinkCount: number = 0;
  private closedFrameCount: number = 0;
  private closureStartTime: number | null = null;
  private currentClosureDuration: number = 0.0;

  // Rolling history for PERCLOS: array of { time: number, closed: boolean }
  private history: { time: number; closed: boolean }[] = [];

  // Calibration state
  private calibrationStartTime: number | null = null;
  private calibrationSamples: number[] = [];
  private isCalibrated: boolean = false;
  private baselineEar: number;

  constructor(config: EyeTrackerConfig = {}) {
    this.earThreshold = config.earThreshold ?? 0.21;
    this.blinkMinFrames = config.blinkMinFrames ?? 2;
    this.blinkMaxFrames = config.blinkMaxFrames ?? 6;
    this.drowsyClosureSec = config.drowsyClosureSec ?? 0.5;
    this.perclosWindowSec = config.perclosWindowSec ?? 60.0;
    this.calibrationDurationSec = config.calibrationDurationSec ?? 10.0;
    this.baselineEar = this.earThreshold;
  }

  /**
   * Reset tracking state.
   */
  public reset(): void {
    this.blinkCount = 0;
    this.closedFrameCount = 0;
    this.closureStartTime = null;
    this.currentClosureDuration = 0.0;
    this.history = [];
    this.calibrationStartTime = null;
    this.calibrationSamples = [];
    this.isCalibrated = false;
    this.baselineEar = this.earThreshold;
  }

  /**
   * Manually trigger re-calibration of user baseline.
   */
  public recalibrate(): void {
    this.calibrationStartTime = null;
    this.calibrationSamples = [];
    this.isCalibrated = false;
  }

  /**
   * Process a single frame landmarks set.
   *
   * @param landmarks - 468 or 478 face mesh landmarks
   * @param timestampSec - Monotonic timestamp in seconds
   */
  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampSec: number
  ): EyeMetrics {
    if (landmarks.length < 468) {
      return this.emptyMetrics();
    }

    const leftEar = calculateEAR(landmarks, LEFT_EYE_EAR_INDICES);
    const rightEar = calculateEAR(landmarks, RIGHT_EYE_EAR_INDICES);
    const avgEar = (leftEar + rightEar) / 2.0;

    // 1. Baseline calibration
    let calibrationProgress = 100;
    if (!this.isCalibrated) {
      if (this.calibrationStartTime === null) {
        this.calibrationStartTime = timestampSec;
      }
      const elapsedCal = timestampSec - this.calibrationStartTime;
      calibrationProgress = Math.min(
        100,
        Math.round((elapsedCal / this.calibrationDurationSec) * 100)
      );

      // Collect sample if eyes appear open
      if (avgEar >= this.earThreshold) {
        this.calibrationSamples.push(avgEar);
      }

      if (elapsedCal >= this.calibrationDurationSec) {
        if (this.calibrationSamples.length > 0) {
          const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
          this.baselineEar = sum / this.calibrationSamples.length;
          // Adaptive threshold at 75% of user's personal open baseline
          this.earThreshold = Math.round(this.baselineEar * 0.75 * 1000) / 1000;
        }
        this.isCalibrated = true;
      }
    }

    // 2. Closure and blink logic
    const isClosed = avgEar < this.earThreshold;

    if (isClosed) {
      this.closedFrameCount++;
      if (this.closureStartTime === null) {
        this.closureStartTime = timestampSec;
      }
      this.currentClosureDuration = Math.max(0, timestampSec - this.closureStartTime);
    } else {
      if (
        this.closedFrameCount >= this.blinkMinFrames &&
        this.closedFrameCount <= this.blinkMaxFrames
      ) {
        this.blinkCount++;
      }
      this.closedFrameCount = 0;
      this.closureStartTime = null;
      this.currentClosureDuration = 0.0;
    }

    const isDrowsyClosure = this.currentClosureDuration >= this.drowsyClosureSec;

    // 3. Rolling PERCLOS calculation
    this.history.push({ time: timestampSec, closed: isClosed });

    // Evict entries older than window
    const cutoffTime = timestampSec - this.perclosWindowSec;
    while (this.history.length > 0 && this.history[0].time < cutoffTime) {
      this.history.shift();
    }

    const perclos = this.calculatePerclos();

    return {
      leftEar: Math.round(leftEar * 1000) / 1000,
      rightEar: Math.round(rightEar * 1000) / 1000,
      avgEar: Math.round(avgEar * 1000) / 1000,
      isClosed,
      closureDurationSec: Math.round(this.currentClosureDuration * 100) / 100,
      isDrowsyClosure,
      blinkCount: this.blinkCount,
      perclos: Math.round(perclos * 10) / 10,
      isCalibrated: this.isCalibrated,
      calibrationProgress,
      baselineEar: Math.round(this.baselineEar * 1000) / 1000,
      earThreshold: this.earThreshold,
    };
  }

  private calculatePerclos(): number {
    if (this.history.length < 2) return 0.0;

    const totalWindow =
      this.history[this.history.length - 1].time - this.history[0].time;
    if (totalWindow <= 0.0) return 0.0;

    let closedDuration = 0.0;
    for (let i = 0; i < this.history.length - 1; i++) {
      const dt = this.history[i + 1].time - this.history[i].time;
      if (this.history[i].closed) {
        closedDuration += dt;
      }
    }

    return (closedDuration / totalWindow) * 100.0;
  }

  private emptyMetrics(): EyeMetrics {
    return {
      leftEar: 0,
      rightEar: 0,
      avgEar: 0,
      isClosed: false,
      closureDurationSec: 0,
      isDrowsyClosure: false,
      blinkCount: this.blinkCount,
      perclos: 0,
      isCalibrated: this.isCalibrated,
      calibrationProgress: this.isCalibrated ? 100 : 0,
      baselineEar: this.baselineEar,
      earThreshold: this.earThreshold,
    };
  }
}
