"use client";

import React from "react";
import { type EyeMetrics } from "@/lib/eyeAnalysis";

interface EyeMetricsCardProps {
  metrics: EyeMetrics | null;
  onRecalibrate?: () => void;
  className?: string;
}

export function EyeMetricsCard({
  metrics,
  onRecalibrate,
  className = "",
}: EyeMetricsCardProps) {
  const avgEar = metrics?.avgEar ?? 0.0;
  const earThreshold = metrics?.earThreshold ?? 0.21;
  const isClosed = metrics?.isClosed ?? false;
  const isDrowsy = metrics?.isDrowsyClosure ?? false;
  const closureDuration = metrics?.closureDurationSec ?? 0.0;
  const blinkCount = metrics?.blinkCount ?? 0;
  const perclos = metrics?.perclos ?? 0.0;
  const isCalibrated = metrics?.isCalibrated ?? false;
  const calProgress = metrics?.calibrationProgress ?? 0;
  const baselineEar = metrics?.baselineEar ?? 0.28;

  // EAR meter percentage for visual bar (0.0 to 0.45 normalized)
  const earPercentage = Math.min(100, Math.max(0, (avgEar / 0.45) * 100));
  const thresholdPercentage = Math.min(100, Math.max(0, (earThreshold / 0.45) * 100));

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      {/* Header with Title and Calibration Status */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👁️</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Eye Closure &amp; Blink Telemetry
            </h3>
            <p className="text-[11px] text-slate-400">
              Live Eye Aspect Ratio (EAR) &amp; PERCLOS Engine
            </p>
          </div>
        </div>

        {/* Calibration Badge / Action */}
        <div className="flex items-center gap-2">
          {isCalibrated ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              ✓ Baseline: {baselineEar.toFixed(3)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-300 animate-pulse">
              Calibrating {calProgress}%
            </span>
          )}
          {onRecalibrate && (
            <button
              onClick={onRecalibrate}
              title="Reset baseline calibration"
              className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Recalibrate
            </button>
          )}
        </div>
      </div>

      {/* Primary EAR Hero Metric */}
      <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              Average EAR
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-3xl font-extrabold font-mono tracking-tight transition-colors ${
                  isDrowsy
                    ? "text-rose-500"
                    : isClosed
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              >
                {avgEar.toFixed(3)}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / th: {earThreshold.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Eye State Badge */}
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isDrowsy
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                  : isClosed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {isDrowsy
                ? `DROWSY CLOSURE (${closureDuration.toFixed(1)}s)`
                : isClosed
                ? `EYES CLOSED (${closureDuration.toFixed(1)}s)`
                : "EYES OPEN"}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 font-mono">
              L: {metrics?.leftEar.toFixed(3) ?? "0.000"} &bull; R:{" "}
              {metrics?.rightEar.toFixed(3) ?? "0.000"}
            </span>
          </div>
        </div>

        {/* Visual Aspect Ratio Bar */}
        <div className="space-y-1">
          <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden">
            {/* Threshold Line Indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-[0_0_4px_#f43f5e]"
              style={{ left: `${thresholdPercentage}%` }}
              title={`Threshold: ${earThreshold}`}
            />
            {/* Dynamic EAR fill */}
            <div
              className={`h-full transition-all duration-100 ${
                isDrowsy
                  ? "bg-rose-500"
                  : isClosed
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-cyan-500 to-emerald-400"
              }`}
              style={{ width: `${earPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0 (Closed)</span>
            <span className="text-rose-400/80">Threshold ({earThreshold})</span>
            <span>0.45 (Wide Open)</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Blink Counter & PERCLOS 60s */}
      <div className="grid grid-cols-2 gap-3">
        {/* Blink Counter */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Total Blinks
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {blinkCount}
            </span>
            <span className="text-xs text-slate-400">blinks</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Detected over 2&ndash;6 frame window
          </p>
        </div>

        {/* PERCLOS Rolling Window */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            PERCLOS (60s)
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                perclos >= 15
                  ? "text-rose-400"
                  : perclos >= 8
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {perclos.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">closure time</span>
          </div>
          <p className="text-[10px] text-slate-500">
            {perclos >= 15
              ? "High fatigue risk"
              : perclos >= 8
              ? "Elevated fatigue"
              : "Normal vigilance range"}
          </p>
        </div>
      </div>
    </div>
  );
}
