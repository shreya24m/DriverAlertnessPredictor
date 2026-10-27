"use client";

import React, { useMemo } from "react";

export interface MetricDataPoint {
  timeSec: number;
  ear: number;
  mar: number;
  risk: number;
}

interface MetricChartsProps {
  history: MetricDataPoint[];
  earThreshold?: number;
  marThreshold?: number;
  className?: string;
}

export function MetricCharts({
  history,
  earThreshold = 0.21,
  marThreshold = 0.6,
  className = "",
}: MetricChartsProps) {
  // Chart dimensions
  const width = 600;
  const height = 140;
  const padding = { top: 12, right: 12, bottom: 22, left: 36 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Window: last 30 data points or last 30 seconds
  const data = useMemo(() => {
    return history.slice(-50);
  }, [history]);

  // Generate SVG path for EAR (0.0 to 0.45 range)
  const earPath = useMemo(() => {
    if (data.length < 2) return "";
    return data
      .map((pt, i) => {
        const x = padding.left + (i / (data.length - 1)) * innerWidth;
        const normalizedY = Math.max(0, Math.min(1, pt.ear / 0.45));
        const y = padding.top + (1 - normalizedY) * innerHeight;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, innerWidth, innerHeight, padding.left, padding.top]);

  // Generate SVG path for MAR (0.0 to 1.0 range)
  const marPath = useMemo(() => {
    if (data.length < 2) return "";
    return data
      .map((pt, i) => {
        const x = padding.left + (i / (data.length - 1)) * innerWidth;
        const normalizedY = Math.max(0, Math.min(1, pt.mar / 1.0));
        const y = padding.top + (1 - normalizedY) * innerHeight;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, innerWidth, innerHeight, padding.left, padding.top]);

  const earThY =
    padding.top + (1 - Math.max(0, Math.min(1, earThreshold / 0.45))) * innerHeight;
  const marThY =
    padding.top + (1 - Math.max(0, Math.min(1, marThreshold / 1.0))) * innerHeight;

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Live EAR &amp; MAR Time Series
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time rolling waveform with threshold reference lines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-cyan-400" />
            <span className="text-slate-300">EAR (Eyes)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-amber-400" />
            <span className="text-slate-300">MAR (Mouth)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas for Charts */}
      <div className="w-full overflow-hidden">
        {data.length < 2 ? (
          <div className="flex h-36 items-center justify-center text-xs text-slate-500 font-mono">
            Waiting for camera feed to stream waveform telemetry...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
          >
            {/* Grid lines */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={width - padding.right}
              y2={padding.top}
              stroke="#334155"
              strokeDasharray="2,2"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight / 2}
              x2={width - padding.right}
              y2={padding.top + innerHeight / 2}
              stroke="#1e293b"
              strokeDasharray="2,2"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={width - padding.right}
              y2={padding.top + innerHeight}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Threshold dashed lines */}
            <line
              x1={padding.left}
              y1={earThY}
              x2={width - padding.right}
              y2={earThY}
              stroke="#06b6d4"
              strokeDasharray="4,4"
              strokeWidth="1"
              opacity="0.6"
            />
            <line
              x1={padding.left}
              y1={marThY}
              x2={width - padding.right}
              y2={marThY}
              stroke="#f59e0b"
              strokeDasharray="4,4"
              strokeWidth="1"
              opacity="0.6"
            />

            {/* Threshold Labels */}
            <text
              x={padding.left - 4}
              y={earThY + 3}
              fill="#06b6d4"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
            >
              th:0.21
            </text>
            <text
              x={width - padding.right + 4}
              y={marThY + 3}
              fill="#f59e0b"
              fontSize="9"
              textAnchor="start"
              fontFamily="monospace"
            >
              th:0.60
            </text>

            {/* Data Paths */}
            <path
              d={earPath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={marPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
        <span>&larr; Rolling 50 frames buffer</span>
        <span>Latest frame &rarr;</span>
      </div>
    </div>
  );
}
