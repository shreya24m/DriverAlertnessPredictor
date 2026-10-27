"use client";

import React from "react";

export interface TimelineEventItem {
  id?: string;
  timestampSec: number;
  eventType: string;
  riskScore: number;
  details?: string;
}

interface EventTimelineProps {
  events: TimelineEventItem[];
  className?: string;
}

export function EventTimeline({ events, className = "" }: EventTimelineProps) {
  const getEventBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "yawn":
        return {
          icon: "🥱",
          label: "Yawn Detected",
          class: "bg-amber-950/60 border-amber-500/40 text-amber-300",
        };
      case "drowsy_closure":
        return {
          icon: "😴",
          label: "Micro-sleep (>0.5s)",
          class: "bg-rose-950/60 border-rose-500/40 text-rose-300",
        };
      case "alarm_critical":
        return {
          icon: "🛑",
          label: "Critical Alarm",
          class: "bg-rose-600 text-white font-bold",
        };
      case "alarm_alert":
        return {
          icon: "🚨",
          label: "Alert Chime",
          class: "bg-orange-950/60 border-orange-500/40 text-orange-300",
        };
      case "alarm_warning":
        return {
          icon: "⚠️",
          label: "Warning Banner",
          class: "bg-amber-950/50 border-amber-500/30 text-amber-300",
        };
      default:
        return {
          icon: "📍",
          label: type.replace("_", " "),
          class: "bg-slate-800 text-slate-300",
        };
    }
  };

  const sortedEvents = [...events].sort((a, b) => a.timestampSec - b.timestampSec);

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧭</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Session Event Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Chronological safety events, micro-sleeps, and alarm triggers
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {events.length} event{events.length === 1 ? "" : "s"} logged
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs space-y-1">
          <span>✓ No fatigue alarms or micro-sleep events in current session.</span>
          <span className="text-[11px] text-slate-600">
            Events will be logged automatically as they occur.
          </span>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {sortedEvents.map((ev, index) => {
            const badge = getEventBadge(ev.eventType);
            const mins = Math.floor(ev.timestampSec / 60);
            const secs = Math.floor(ev.timestampSec % 60);
            const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

            return (
              <div key={index} className="relative group">
                {/* Node dot on timeline */}
                <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full bg-slate-900 border-2 border-cyan-500 shadow-sm" />

                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1 transition hover:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{badge.icon}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">t = {timeStr}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ev.riskScore >= 60
                            ? "bg-rose-950/60 text-rose-400"
                            : ev.riskScore >= 30
                            ? "bg-amber-950/60 text-amber-400"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        Risk {ev.riskScore}
                      </span>
                    </div>
                  </div>

                  {ev.details && (
                    <p className="text-xs text-slate-400 font-mono pl-6">
                      {ev.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
