"""Risk assessment engine and escalating alarm state machine with hysteresis.

Calculates composite drowsiness risk score (0-100) using a weighted mix of:
- PERCLOS percentage
- Prolonged eye closure duration (micro-sleeps)
- Yawn frequency
- Blink frequency abnormality

Manages smooth escalation and de-escalation across 4 alarm tiers:
Level 0: OK (Normal vigilance)
Level 1: Warning (Mild drowsiness, soft banner)
Level 2: Alert (High drowsiness, sound prompt)
Level 3: Critical (Dangerous fatigue, urgent repeating siren)

Hysteresis is applied to prevent rapid flickering around threshold boundaries.
All thresholds and hysteresis parameters are loaded from app.core.config.settings.
"""

from enum import IntEnum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from app.core.config import settings


class AlarmLevel(IntEnum):
    """Graduated alarm escalation tiers."""

    OK = 0
    WARNING = 1
    ALERT = 2
    CRITICAL = 3


class RiskAssessment(BaseModel):
    """Comprehensive output of the risk engine for a single evaluation cycle."""

    risk_score: int = Field(..., ge=0, le=100, description="Composite risk score from 0 to 100")
    alarm_level: AlarmLevel = Field(..., description="Active alarm level (0=OK, 1=Warning, 2=Alert, 3=Critical)")
    alarm_label: str = Field(..., description="Human-readable alarm label")
    perclos_contribution: float = Field(..., description="Points from rolling PERCLOS")
    closure_contribution: float = Field(..., description="Points from prolonged eye closures")
    yawn_contribution: float = Field(..., description="Points from recent yawning")
    blink_contribution: float = Field(..., description="Points from blink rate abnormality")
    is_escalated: bool = Field(default=False, description="True if alarm level escalated in this step")
    is_deescalated: bool = Field(default=False, description="True if alarm level de-escalated in this step")


def compute_composite_risk(
    perclos: float,
    closure_duration_sec: float,
    recent_yawns: int,
    is_drowsy_closure: bool,
    blink_count_last_min: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate the weighted composite risk score (0-100) and its sub-components.

    Formula weights:
    - PERCLOS (max 40 pts): Standard 0-30% maps to 0-40 points
    - Drowsy Closures (max 35 pts): Eyes closed >0.5s adds 20 pts + 15 pts/sec
    - Yawns (max 20 pts): 10 pts per recent yawn (up to 2 yawns)
    - Blink Abnormality (max 10 pts): Low blink frequency (<6/min)

    Args:
        perclos: Rolling PERCLOS percentage (0.0 to 100.0).
        closure_duration_sec: Active eye closure duration in seconds.
        recent_yawns: Number of yawns detected in recent window.
        is_drowsy_closure: True if current eye closure exceeds 0.5s.
        blink_count_last_min: Estimated blinks in previous 60 seconds.

    Returns:
        Dictionary containing total risk_score and individual component contributions.
    """
    # 1. PERCLOS component (up to 40 pts)
    # 0% -> 0 pts, 15% -> 20 pts, 30%+ -> 40 pts
    perclos_pts = min(40.0, max(0.0, (perclos / 30.0) * 40.0))

    # 2. Prolonged Eye Closure / Micro-sleep component (up to 35 pts)
    closure_pts = 0.0
    if is_drowsy_closure:
        closure_pts = 20.0 + min(15.0, (closure_duration_sec - settings.DROWSY_CLOSURE_DURATION_SEC) * 15.0)

    # 3. Yawn component (up to 20 pts)
    yawn_pts = min(20.0, float(recent_yawns * 10.0))

    # 4. Blink rate component (up to 10 pts)
    blink_pts = 0.0
    if blink_count_last_min is not None:
        if blink_count_last_min < 6:
            blink_pts = 10.0
        elif blink_count_last_min < 10:
            blink_pts = 5.0

    raw_score = perclos_pts + closure_pts + yawn_pts + blink_pts
    final_score = int(round(max(0.0, min(100.0, raw_score))))

    return {
        "risk_score": final_score,
        "perclos_contribution": round(perclos_pts, 1),
        "closure_contribution": round(closure_pts, 1),
        "yawn_contribution": round(yawn_pts, 1),
        "blink_contribution": round(blink_pts, 1),
    }


class RiskEngine:
    """Stateful drowsiness risk engine managing smooth alarm level transitions with hysteresis."""

    def __init__(
        self,
        warning_threshold: int = settings.ALARM_LEVEL_WARNING_RISK,
        alert_threshold: int = settings.ALARM_LEVEL_ALERT_RISK,
        critical_threshold: int = settings.ALARM_LEVEL_CRITICAL_RISK,
        hysteresis_decrease: int = settings.ALARM_HYSTERESIS_DECREASE,
    ):
        self.warning_threshold = warning_threshold
        self.alert_threshold = alert_threshold
        self.critical_threshold = critical_threshold
        self.hysteresis = hysteresis_decrease

        # Current state
        self.current_level: AlarmLevel = AlarmLevel.OK
        self.current_risk_score: int = 0

    def reset(self) -> None:
        """Reset risk score and alarm state to OK."""
        self.current_level = AlarmLevel.OK
        self.current_risk_score = 0

    def evaluate(
        self,
        perclos: float,
        closure_duration_sec: float = 0.0,
        recent_yawns: int = 0,
        is_drowsy_closure: bool = False,
        blink_count_last_min: Optional[int] = None,
    ) -> RiskAssessment:
        """Evaluate drowsiness indicators and determine current alarm level with hysteresis.

        Escalation occurs immediately upon exceeding the threshold.
        De-escalation requires dropping below threshold minus the hysteresis buffer.

        Args:
            perclos: Rolling PERCLOS percentage (0-100%).
            closure_duration_sec: Current continuous eye closure duration.
            recent_yawns: Recent yawn count.
            is_drowsy_closure: True if closure exceeds 0.5s.
            blink_count_last_min: Optional blink count in last minute.

        Returns:
            RiskAssessment with updated risk score and alarm level.
        """
        components = compute_composite_risk(
            perclos=perclos,
            closure_duration_sec=closure_duration_sec,
            recent_yawns=recent_yawns,
            is_drowsy_closure=is_drowsy_closure,
            blink_count_last_min=blink_count_last_min,
        )
        risk = components["risk_score"]
        self.current_risk_score = risk

        previous_level = self.current_level
        new_level = self._apply_hysteresis(risk, previous_level)
        self.current_level = new_level

        is_escalated = new_level > previous_level
        is_deescalated = new_level < previous_level

        labels = {
            AlarmLevel.OK: "OK - Alert & Vigilant",
            AlarmLevel.WARNING: "Warning - Mild Drowsiness Detected",
            AlarmLevel.ALERT: "Alert - High Fatigue, Pull Over",
            AlarmLevel.CRITICAL: "Critical - Severe Drowsiness Danger!",
        }

        return RiskAssessment(
            risk_score=risk,
            alarm_level=new_level,
            alarm_label=labels[new_level],
            perclos_contribution=components["perclos_contribution"],
            closure_contribution=components["closure_contribution"],
            yawn_contribution=components["yawn_contribution"],
            blink_contribution=components["blink_contribution"],
            is_escalated=is_escalated,
            is_deescalated=is_deescalated,
        )

    def _apply_hysteresis(self, risk: int, current_level: AlarmLevel) -> AlarmLevel:
        """Apply directional hysteresis logic to prevent alarm state flickering."""
        # 1. Escalation conditions (immediate when crossing upwards)
        if risk >= self.critical_threshold:
            return AlarmLevel.CRITICAL
        if risk >= self.alert_threshold and current_level < AlarmLevel.CRITICAL:
            return AlarmLevel.ALERT
        if risk >= self.warning_threshold and current_level < AlarmLevel.ALERT:
            return AlarmLevel.WARNING

        # 2. De-escalation conditions (require buffer drop to prevent flapping)
        if current_level == AlarmLevel.CRITICAL:
            # Drop below (critical_threshold - hysteresis) to exit Critical
            if risk < (self.critical_threshold - self.hysteresis):
                # Check if it should drop to ALERT or lower
                if risk >= self.alert_threshold:
                    return AlarmLevel.ALERT
                elif risk >= self.warning_threshold:
                    return AlarmLevel.WARNING
                else:
                    return AlarmLevel.OK
            return AlarmLevel.CRITICAL

        if current_level == AlarmLevel.ALERT:
            # Drop below (alert_threshold - hysteresis) to exit Alert
            if risk < (self.alert_threshold - self.hysteresis):
                if risk >= self.warning_threshold:
                    return AlarmLevel.WARNING
                else:
                    return AlarmLevel.OK
            return AlarmLevel.ALERT

        if current_level == AlarmLevel.WARNING:
            # Drop below (warning_threshold - hysteresis) to exit Warning
            if risk < (self.warning_threshold - self.hysteresis):
                return AlarmLevel.OK
            return AlarmLevel.WARNING

        return AlarmLevel.OK
