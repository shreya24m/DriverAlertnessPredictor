"use client";

import React from "react";
import { type YawnMetrics } from "@/lib/yawnDetection";

interface YawnMetricsCardProps {
  metrics: YawnMetrics | null;
  className?: string;
}

export function YawnMetricsCard({
  metrics,
  className = "",
}: YawnMetricsCardProps) {
  const mar = metrics?.mar ?? 0.0;
  const marThreshold = metrics?.marThreshold ?? 0.60;
  const isMouthOpen = metrics?.isMouthOpen ?? false;
  const isYawning = metrics?.isYawning ?? false;
  const openDuration = metrics?.openDurationSec ?? 0.0;
  const yawnCount = metrics?.yawnCount ?? 0;
  const progressToYawn = metrics?.progressToYawn ?? 0;

  // Visual MAR percentage (0.0 to 1.0 normalized)
  const marPercentage = Math.min(100, Math.max(0, mar * 100));
  const thresholdPercentage = Math.min(100, Math.max(0, marThreshold * 100));

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🥱</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Yawn &amp; Mouth Movement Detection
            </h3>
            <p className="text-[11px] text-slate-400">
              Mouth Aspect Ratio (MAR) with 1.5s Duration Filter
            </p>
          </div>
        </div>

        {/* Filter Indicator Badge */}
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] font-mono text-slate-300">
          Filter: &gt;1.5s
        </span>
      </div>

      {/* Primary MAR Hero Metric */}
      <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              Live MAR Value
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-3xl font-extrabold font-mono tracking-tight transition-colors ${
                  isYawning
                    ? "text-rose-500 animate-pulse"
                    : isMouthOpen
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              >
                {mar.toFixed(3)}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / th: {marThreshold.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isYawning
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce"
                  : isMouthOpen
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800/80 text-slate-300 border border-slate-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {isYawning
                ? `YAWN DETECTED (${openDuration.toFixed(1)}s)`
                : isMouthOpen
                ? `OPEN (${openDuration.toFixed(1)}s)`
                : "MOUTH CLOSED"}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              {isYawning
                ? "Fatigue indicator confirmed"
                : isMouthOpen
                ? "Conversational filter active"
                : "Normal breathing state"}
            </span>
          </div>
        </div>

        {/* Visual Aspect Ratio Bar */}
        <div className="space-y-1">
          <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
            {/* Threshold line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-[0_0_4px_#f43f5e]"
              style={{ left: `${thresholdPercentage}%` }}
              title={`MAR Threshold: ${marThreshold}`}
            />
            {/* Fill */}
            <div
              className={`h-full transition-all duration-100 ${
                isYawning
                  ? "bg-rose-500"
                  : isMouthOpen
                  ? "bg-amber-400"
                  : "bg-cyan-500"
              }`}
              style={{ width: `${marPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0 (Closed)</span>
            <span className="text-rose-400/80">Yawn Threshold ({marThreshold})</span>
            <span>1.0 (Wide Open)</span>
          </div>
        </div>
      </div>

      {/* Yawn Duration Filter Progress & Total Count */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Yawns Count */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Total Yawns
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                yawnCount > 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {yawnCount}
            </span>
            <span className="text-xs text-slate-400">yawns</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Filtered: talking &lt; 1.5s not counted
          </p>
        </div>

        {/* Duration Filter Progress */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Duration Filter
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                isYawning
                  ? "text-rose-400"
                  : isMouthOpen
                  ? "text-amber-300"
                  : "text-slate-500"
              }`}
            >
              {openDuration.toFixed(1)}s
            </span>
            <span className="text-xs text-slate-500">/ 1.5s</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-150 ${
                isYawning ? "bg-rose-500" : "bg-amber-400"
              }`}
              style={{ width: `${progressToYawn}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
