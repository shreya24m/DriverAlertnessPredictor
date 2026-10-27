"use client";

import React from "react";
import { AlarmLevel, type RiskAssessment } from "@/lib/riskEngine";

interface AlarmBannerProps {
  assessment: RiskAssessment | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onTestAlarm?: (level: AlarmLevel) => void;
  className?: string;
}

export function AlarmBanner({
  assessment,
  isMuted,
  onToggleMute,
  onTestAlarm,
  className = "",
}: AlarmBannerProps) {
  const alarmLevel = assessment?.alarmLevel ?? AlarmLevel.OK;
  const riskScore = assessment?.riskScore ?? 0;

  // Banner visual configurations
  const bannerConfigs: Record<
    AlarmLevel,
    {
      containerClass: string;
      icon: string;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeClass: string;
    }
  > = {
    [AlarmLevel.OK]: {
      containerClass:
        "border-emerald-500/20 bg-emerald-950/20 text-emerald-200",
      icon: "🛡️",
      title: "Driver Vigilance Normal",
      subtitle: "Eye closure, blinks, and yawning within safe thresholds.",
      badgeText: "Level 0: OK",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    [AlarmLevel.WARNING]: {
      containerClass:
        "border-amber-500/30 bg-amber-950/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
      icon: "⚠️",
      title: "Warning: Mild Drowsiness Detected",
      subtitle: "Elevated PERCLOS or yawning observed. Consider taking a break soon.",
      badgeText: "Level 1: Warning",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    [AlarmLevel.ALERT]: {
      containerClass:
        "border-orange-500/50 bg-orange-950/40 text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.25)] animate-pulse",
      icon: "🚨",
      title: "ALERT: High Fatigue Detected!",
      subtitle: "Prolonged eye closures or frequent yawning. Pull over safely immediately.",
      badgeText: "Level 2: Alert (Sound Active)",
      badgeClass: "bg-orange-500/30 text-orange-200 border-orange-500/50",
    },
    [AlarmLevel.CRITICAL]: {
      containerClass:
        "border-rose-500/80 bg-rose-950/60 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-bounce",
      icon: "🛑",
      title: "CRITICAL DANGER: SEVERE DROWSINESS / MICRO-SLEEP!",
      subtitle: "IMMEDIATE ACCIDENT RISK! BRING VEHICLE TO A SAFE STOP NOW!",
      badgeText: "Level 3: CRITICAL SIREN",
      badgeClass: "bg-rose-500 text-white font-extrabold border-rose-300 shadow-md",
    },
  };

  const current = bannerConfigs[alarmLevel];

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-md transition-all duration-300 ${current.containerClass} ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Icon and Message */}
        <div className="flex items-start sm:items-center gap-3.5">
          <span className="text-2xl sm:text-3xl shrink-0">{current.icon}</span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                {current.title}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${current.badgeClass}`}
              >
                {current.badgeText}
              </span>
            </div>
            <p className="text-xs opacity-85 leading-relaxed">{current.subtitle}</p>
          </div>
        </div>

        {/* Right: Audio Controls & Test Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-sm ${
              isMuted
                ? "border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50"
                : "border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
            }`}
            title={isMuted ? "Audio is currently muted" : "Audio alerts are active"}
          >
            <span>{isMuted ? "🔇" : "🔊"}</span>
            <span>{isMuted ? "Unmute Audio" : "Mute Audio"}</span>
          </button>

          {/* Audio Quick Test dropdown/buttons */}
          {onTestAlarm && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onTestAlarm(AlarmLevel.ALERT)}
                className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Play 2-tone alert chime"
              >
                Test Alert 🔔
              </button>
              <button
                onClick={() => onTestAlarm(AlarmLevel.CRITICAL)}
                className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:text-white hover:bg-rose-900/60 transition"
                title="Play critical repeating siren"
              >
                Test Siren 🚨
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hysteresis Buffer Information Bar */}
      <div className="mt-3 pt-2.5 border-t border-current/10 flex flex-wrap items-center justify-between text-[11px] opacity-75 font-mono">
        <span>Current Risk: {riskScore}/100</span>
        <span>Escalate: &ge;30 &bull; &ge;60 &bull; &ge;80 | Hysteresis: -5 buffer</span>
      </div>
    </div>
  );
}
