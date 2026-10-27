"""Unit tests for risk_engine service testing risk scoring and hysteresis."""

import pytest
from app.services.risk_engine import (
    AlarmLevel,
    RiskEngine,
    compute_composite_risk,
)


def test_alert_driver_has_zero_risk() -> None:
    """An alert driver with 0% PERCLOS, no yawns, and normal blinks has 0 risk."""
    assessment = compute_composite_risk(
        perclos=0.0,
        closure_duration_sec=0.0,
        recent_yawns=0,
        is_drowsy_closure=False,
        blink_count_last_min=15,
    )
    assert assessment["risk_score"] == 0
    assert assessment["perclos_contribution"] == 0.0
    assert assessment["closure_contribution"] == 0.0
    assert assessment["yawn_contribution"] == 0.0


def test_composite_risk_components_scaling() -> None:
    """Individual fatigue factors correctly scale the composite risk score."""
    # Only PERCLOS 15% (half of 30%) -> ~20 points
    r_perclos = compute_composite_risk(
        perclos=15.0,
        closure_duration_sec=0.0,
        recent_yawns=0,
        is_drowsy_closure=False,
    )
    assert 19 <= r_perclos["risk_score"] <= 21

    # Drowsy closure of 0.8s -> 20 + (0.8 - 0.5)*15 = 24.5 points
    r_closure = compute_composite_risk(
        perclos=0.0,
        closure_duration_sec=0.8,
        recent_yawns=0,
        is_drowsy_closure=True,
    )
    assert 24 <= r_closure["risk_score"] <= 26

    # 2 yawns -> 20 points
    r_yawns = compute_composite_risk(
        perclos=0.0,
        closure_duration_sec=0.0,
        recent_yawns=2,
        is_drowsy_closure=False,
    )
    assert r_yawns["risk_score"] == 20

    # Severe combined condition -> Critical risk score (>80)
    r_severe = compute_composite_risk(
        perclos=30.0,  # 40 pts
        closure_duration_sec=1.2,  # 20 + 0.7*15 = 30.5 pts
        recent_yawns=2,  # 20 pts
        is_drowsy_closure=True,
    )
    assert r_severe["risk_score"] >= 80


def test_alarm_levels_escalation() -> None:
    """RiskEngine escalates appropriately across 4 levels."""
    engine = RiskEngine(
        warning_threshold=30,
        alert_threshold=60,
        critical_threshold=80,
    )

    # Risk 10 -> Level 0 OK
    res0 = engine.evaluate(perclos=7.5)
    assert res0.alarm_level == AlarmLevel.OK

    # Risk 35 -> Level 1 Warning
    res1 = engine.evaluate(perclos=26.5)
    assert res1.alarm_level == AlarmLevel.WARNING
    assert res1.is_escalated

    # Risk 60 -> Level 2 Alert
    res2 = engine.evaluate(perclos=30.0, recent_yawns=2)
    assert res2.risk_score == 60
    assert res2.alarm_level == AlarmLevel.ALERT
    assert res2.is_escalated

    # Risk 88 -> Level 3 Critical
    res3 = engine.evaluate(perclos=30.0, recent_yawns=2, closure_duration_sec=1.0, is_drowsy_closure=True)
    assert res3.risk_score >= 80
    assert res3.alarm_level == AlarmLevel.CRITICAL
    assert res3.is_escalated


def test_hysteresis_prevents_alarm_flickering() -> None:
    """Alarm level must NOT flicker when risk score fluctuates around threshold."""
    engine = RiskEngine(
        warning_threshold=30,
        alert_threshold=60,
        critical_threshold=80,
        hysteresis_decrease=5,
    )

    # 1. Escalate to WARNING when risk crosses 30 (e.g. at 32)
    # Using 24% PERCLOS -> 32 risk score
    res_up = engine.evaluate(perclos=24.0)
    assert res_up.risk_score == 32
    assert res_up.alarm_level == AlarmLevel.WARNING

    # 2. Risk drops slightly to 28 (below 30, but above 30 - 5 = 25)
    # Hysteresis buffer: must stay at WARNING!
    res_hover1 = engine.evaluate(perclos=21.0)
    assert res_hover1.risk_score == 28
    assert res_hover1.alarm_level == AlarmLevel.WARNING, "Hysteresis failed: level flapped to OK at 28!"

    # 3. Risk hovers at 26 (still above 25)
    res_hover2 = engine.evaluate(perclos=19.5)
    assert res_hover2.risk_score == 26
    assert res_hover2.alarm_level == AlarmLevel.WARNING, "Hysteresis failed: level flapped to OK at 26!"

    # 4. Risk drops to 23 (below 25 buffer) -> Smooth de-escalation to OK
    res_down = engine.evaluate(perclos=17.0)
    assert res_down.risk_score == 23
    assert res_down.alarm_level == AlarmLevel.OK
    assert res_down.is_deescalated


def test_hysteresis_on_alert_level() -> None:
    """Hysteresis applies similarly to Level 2 (Alert) threshold."""
    engine = RiskEngine(
        warning_threshold=30,
        alert_threshold=60,
        critical_threshold=80,
        hysteresis_decrease=5,
    )

    # Escalate to ALERT at 62 (PERCLOS 30% [40 pts] + Yawn 2 [20 pts] + 2 pts)
    res_alert = engine.evaluate(perclos=30.0, recent_yawns=2, blink_count_last_min=9)
    assert res_alert.risk_score >= 60
    assert res_alert.alarm_level == AlarmLevel.ALERT

    # Drops to 57 (above 60 - 5 = 55): remains ALERT
    res_hover = engine.evaluate(perclos=30.0, recent_yawns=1, closure_duration_sec=0.0, is_drowsy_closure=False, blink_count_last_min=8)
    assert 55 <= res_hover.risk_score < 60
    assert res_hover.alarm_level == AlarmLevel.ALERT

    # Drops to 40 (below 55): de-escalates to WARNING (since 40 >= 30)
    res_drop = engine.evaluate(perclos=30.0, recent_yawns=0, closure_duration_sec=0.0, is_drowsy_closure=False)
    assert res_drop.risk_score == 40
    assert res_drop.alarm_level == AlarmLevel.WARNING
