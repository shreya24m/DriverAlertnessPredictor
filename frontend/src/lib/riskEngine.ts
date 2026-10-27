/**
 * Client-side Drowsiness Risk Engine and Escalating Alarm State Machine.
 *
 * Implements composite 0-100 risk scoring with directional hysteresis
 * to prevent flickering between alarm levels.
 */

export enum AlarmLevel {
  OK = 0,
  WARNING = 1,
  ALERT = 2,
  CRITICAL = 3,
}

export interface RiskConfig {
  warningThreshold?: number;
  alertThreshold?: number;
  criticalThreshold?: number;
  hysteresisDecrease?: number;
  drowsyClosureSec?: number;
}

export interface RiskAssessment {
  riskScore: number;
  alarmLevel: AlarmLevel;
  alarmLabel: string;
  perclosContribution: number;
  closureContribution: number;
  yawnContribution: number;
  blinkContribution: number;
  isEscalated: boolean;
  isDeescalated: boolean;
}

/**
 * Compute the weighted 0-100 composite risk score.
 */
export function computeRiskScore(
  perclos: number,
  closureDurationSec: number,
  recentYawns: number,
  isDrowsyClosure: boolean,
  blinkCountLastMin?: number,
  drowsyClosureSec: number = 0.5
): {
  riskScore: number;
  perclosPts: number;
  closurePts: number;
  yawnPts: number;
  blinkPts: number;
} {
  // 1. PERCLOS component (up to 40 pts)
  const perclosPts = Math.min(40.0, Math.max(0.0, (perclos / 30.0) * 40.0));

  // 2. Prolonged Eye Closure / Micro-sleep component (up to 35 pts)
  let closurePts = 0.0;
  if (isDrowsyClosure) {
    closurePts =
      20.0 + Math.min(15.0, (closureDurationSec - drowsyClosureSec) * 15.0);
  }

  // 3. Yawn component (up to 20 pts)
  const yawnPts = Math.min(20.0, recentYawns * 10.0);

  // 4. Blink frequency component (up to 10 pts)
  let blinkPts = 0.0;
  if (blinkCountLastMin !== undefined) {
    if (blinkCountLastMin < 6) {
      blinkPts = 10.0;
    } else if (blinkCountLastMin < 10) {
      blinkPts = 5.0;
    }
  }

  const rawScore = perclosPts + closurePts + yawnPts + blinkPts;
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    riskScore: finalScore,
    perclosPts: Math.round(perclosPts * 10) / 10,
    closurePts: Math.round(closurePts * 10) / 10,
    yawnPts: Math.round(yawnPts * 10) / 10,
    blinkPts: Math.round(blinkPts * 10) / 10,
  };
}

/**
 * Stateful risk assessment engine with hysteresis.
 */
export class ClientRiskEngine {
  public readonly warningThreshold: number;
  public readonly alertThreshold: number;
  public readonly criticalThreshold: number;
  public readonly hysteresis: number;
  public readonly drowsyClosureSec: number;

  private currentLevel: AlarmLevel = AlarmLevel.OK;
  private currentRiskScore: number = 0;

  constructor(config: RiskConfig = {}) {
    this.warningThreshold = config.warningThreshold ?? 30;
    this.alertThreshold = config.alertThreshold ?? 60;
    this.criticalThreshold = config.criticalThreshold ?? 80;
    this.hysteresis = config.hysteresisDecrease ?? 5;
    this.drowsyClosureSec = config.drowsyClosureSec ?? 0.5;
  }

  public reset(): void {
    this.currentLevel = AlarmLevel.OK;
    this.currentRiskScore = 0;
  }

  public getLevel(): AlarmLevel {
    return this.currentLevel;
  }

  public getScore(): number {
    return this.currentRiskScore;
  }

  /**
   * Evaluate fatigue inputs and determine the current alarm level with hysteresis.
   */
  public evaluate(
    perclos: number,
    closureDurationSec: number = 0,
    recentYawns: number = 0,
    isDrowsyClosure: boolean = false,
    blinkCountLastMin?: number
  ): RiskAssessment {
    const comp = computeRiskScore(
      perclos,
      closureDurationSec,
      recentYawns,
      isDrowsyClosure,
      blinkCountLastMin,
      this.drowsyClosureSec
    );

    const previousLevel = this.currentLevel;
    const newLevel = this.applyHysteresis(comp.riskScore, previousLevel);
    this.currentLevel = newLevel;
    this.currentRiskScore = comp.riskScore;

    const isEscalated = newLevel > previousLevel;
    const isDeescalated = newLevel < previousLevel;

    const labels: Record<AlarmLevel, string> = {
      [AlarmLevel.OK]: "Vigilance Normal",
      [AlarmLevel.WARNING]: "Warning: Mild Drowsiness",
      [AlarmLevel.ALERT]: "Alert: High Fatigue Detected",
      [AlarmLevel.CRITICAL]: "Critical: Severe Drowsiness Danger!",
    };

    return {
      riskScore: comp.riskScore,
      alarmLevel: newLevel,
      alarmLabel: labels[newLevel],
      perclosContribution: comp.perclosPts,
      closureContribution: comp.closurePts,
      yawnContribution: comp.yawnPts,
      blinkContribution: comp.blinkPts,
      isEscalated,
      isDeescalated,
    };
  }

  private applyHysteresis(risk: number, current: AlarmLevel): AlarmLevel {
    // 1. Escalation conditions (immediate when crossing upwards)
    if (risk >= this.criticalThreshold) {
      return AlarmLevel.CRITICAL;
    }
    if (risk >= this.alertThreshold && current < AlarmLevel.CRITICAL) {
      return AlarmLevel.ALERT;
    }
    if (risk >= this.warningThreshold && current < AlarmLevel.ALERT) {
      return AlarmLevel.WARNING;
    }

    // 2. De-escalation conditions (require buffer drop to prevent flapping)
    if (current === AlarmLevel.CRITICAL) {
      if (risk < this.criticalThreshold - this.hysteresis) {
        if (risk >= this.alertThreshold) return AlarmLevel.ALERT;
        if (risk >= this.warningThreshold) return AlarmLevel.WARNING;
        return AlarmLevel.OK;
      }
      return AlarmLevel.CRITICAL;
    }

    if (current === AlarmLevel.ALERT) {
      if (risk < this.alertThreshold - this.hysteresis) {
        if (risk >= this.warningThreshold) return AlarmLevel.WARNING;
        return AlarmLevel.OK;
      }
      return AlarmLevel.ALERT;
    }

    if (current === AlarmLevel.WARNING) {
      if (risk < this.warningThreshold - this.hysteresis) {
        return AlarmLevel.OK;
      }
      return AlarmLevel.WARNING;
    }

    return AlarmLevel.OK;
  }
}
