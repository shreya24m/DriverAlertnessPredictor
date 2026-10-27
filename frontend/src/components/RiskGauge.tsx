"use client";

import React from "react";
import { AlarmLevel, type RiskAssessment } from "@/lib/riskEngine";

interface RiskGaugeProps {
  assessment: RiskAssessment | null;
  className?: string;
}

export function RiskGauge({ assessment, className = "" }: RiskGaugeProps) {
  const riskScore = assessment?.riskScore ?? 0;
  const alarmLevel = assessment?.alarmLevel ?? AlarmLevel.OK;

  // Arc calculation (semi-circle from 180deg to 0deg)
  const radius = 70;
  const strokeWidth = 12;
  const cx = 90;
  const cy = 85;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const progressOffset = circumference - (riskScore / 100) * circumference;

  // Dynamic color palette based on active level
  const levelColors: Record<AlarmLevel, { stroke: string; text: string; bg: string }> = {
    [AlarmLevel.OK]: {
      stroke: "#10b981", // Emerald
      text: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-500/30",
    },
    [AlarmLevel.WARNING]: {
      stroke: "#f59e0b", // Amber
      text: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-500/30",
    },
    [AlarmLevel.ALERT]: {
      stroke: "#f97316", // Orange
      text: "text-orange-400",
      bg: "bg-orange-950/40 border-orange-500/30",
    },
    [AlarmLevel.CRITICAL]: {
      stroke: "#ef4444", // Red
      text: "text-rose-500",
      bg: "bg-rose-950/50 border-rose-500/40 animate-pulse",
    },
  };

  const currentColors = levelColors[alarmLevel];

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Composite Drowsiness Risk
            </h3>
            <p className="text-[11px] text-slate-400">
              Multi-Metric Risk Score &amp; Escalation Engine
            </p>
          </div>
        </div>

        {/* Level Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${currentColors.bg} ${currentColors.text}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          Level {alarmLevel}: {alarmLevel === 0 ? "OK" : alarmLevel === 1 ? "WARNING" : alarmLevel === 2 ? "ALERT" : "CRITICAL"}
        </span>
      </div>

      {/* Circular SVG Gauge and Big Score */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
        <div className="relative flex items-center justify-center">
          <svg width="180" height="105" viewBox="0 0 180 105" className="overflow-visible">
            {/* Background Arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Threshold Tick Marks */}
            {/* 30 Warning */}
            <circle
              cx={cx + radius * Math.cos(Math.PI * (1 - 30 / 100))}
              cy={cy - radius * Math.sin(Math.PI * (1 - 30 / 100))}
              r="2.5"
              fill="#f59e0b"
            />
            {/* 60 Alert */}
            <circle
              cx={cx + radius * Math.cos(Math.PI * (1 - 60 / 100))}
              cy={cy - radius * Math.sin(Math.PI * (1 - 60 / 100))}
              r="2.5"
              fill="#f97316"
            />
            {/* 80 Critical */}
            <circle
              cx={cx + radius * Math.cos(Math.PI * (1 - 80 / 100))}
              cy={cy - radius * Math.sin(Math.PI * (1 - 80 / 100))}
              r="2.5"
              fill="#ef4444"
            />

            {/* Dynamic Value Arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke={currentColors.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>

          {/* Central Number inside Arc */}
          <div className="absolute bottom-1 text-center">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight ${currentColors.text} transition-colors`}
            >
              {riskScore}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono uppercase">
              / 100 Risk
            </span>
          </div>
        </div>

        {/* Tier Scales Legend */}
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">0&ndash;29:</span>
            <span className="text-slate-200">Normal (OK)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">30&ndash;59:</span>
            <span className="text-slate-200">Warning (Banner)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-slate-400">60&ndash;79:</span>
            <span className="text-slate-200">Alert (Sound)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-slate-400">80&ndash;100:</span>
            <span className="text-slate-200 font-bold">Critical (Siren)</span>
          </div>
        </div>
      </div>

      {/* Component Factor Breakdown */}
      <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-2">
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
          Risk Factors Contribution
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400">PERCLOS 60s:</span>
            <span className={assessment?.perclosContribution ? "text-cyan-400" : "text-slate-500"}>
              +{assessment?.perclosContribution ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400">Closures:</span>
            <span className={assessment?.closureContribution ? "text-rose-400" : "text-slate-500"}>
              +{assessment?.closureContribution ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400">Yawns:</span>
            <span className={assessment?.yawnContribution ? "text-amber-400" : "text-slate-500"}>
              +{assessment?.yawnContribution ?? 0} pts
            </span>
          </div>
          <div className="flex justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400">Blink Rate:</span>
            <span className={assessment?.blinkContribution ? "text-indigo-400" : "text-slate-500"}>
              +{assessment?.blinkContribution ?? 0} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
