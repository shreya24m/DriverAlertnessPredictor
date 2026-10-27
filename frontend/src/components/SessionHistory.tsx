"use client";

import React, { useState } from "react";
import { type SavedSession, getReportDownloadUrl, deleteSession } from "@/lib/api";

interface SessionHistoryProps {
  sessions: SavedSession[];
  onSessionDeleted?: (sessionId: string) => void;
  onSelectSession?: (session: SavedSession) => void;
  className?: string;
}

export function SessionHistory({
  sessions,
  onSessionDeleted,
  onSelectSession,
  className = "",
}: SessionHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this trip record?")) return;
    setDeletingId(sessionId);
    const ok = await deleteSession(sessionId);
    setDeletingId(null);
    if (ok && onSessionDeleted) {
      onSessionDeleted(sessionId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Saved Trip History &amp; Safety Reports
            </h3>
            <p className="text-[11px] text-slate-400">
              Download formal PDF reports and review previous vigilance records
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {sessions.length} saved trip{sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs space-y-1">
          <span>No recorded sessions in history yet.</span>
          <span className="text-[11px] text-slate-600">
            Start a session using the Trip Monitoring panel and click &quot;End Session&quot; to save.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Date &amp; Time</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Avg EAR / MAR</th>
                <th className="py-2.5 px-3">Peak Risk</th>
                <th className="py-2.5 px-3">Events</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((s) => {
                const dateStr = new Date(s.start_time).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectSession && onSelectSession(s)}
                  >
                    <td className="py-3 px-3 text-slate-200">
                      <div className="font-semibold">{dateStr}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {s.id.substring(0, 12)}...
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      {formatDuration(s.duration_sec)}
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <span className="text-cyan-400">{s.avg_ear.toFixed(2)}</span>
                      <span className="text-slate-600"> / </span>
                      <span className="text-amber-400">{s.avg_mar.toFixed(2)}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.peak_risk >= 60
                            ? "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                            : s.peak_risk >= 30
                            ? "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {s.peak_risk}/100
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      <span>{s.total_blinks}b</span> &bull;{" "}
                      <span>{s.total_yawns}y</span> &bull;{" "}
                      <span className={s.drowsy_events_count > 0 ? "text-rose-400" : ""}>
                        {s.drowsy_events_count} micro-sleep
                      </span>
                    </td>

                    <td
                      className="py-3 px-3 text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Download PDF Safety Report button */}
                      <a
                        href={getReportDownloadUrl(s.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-cyan-950/60 border border-cyan-500/40 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900/60 transition shadow-sm"
                        title="Download official PDF safety report"
                      >
                        📄 PDF Report
                      </a>

                      {/* Delete Session */}
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="inline-flex items-center rounded border border-rose-950 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-900/50 hover:text-white transition disabled:opacity-50"
                        title="Delete session"
                      >
                        {deletingId === s.id ? "..." : "🗑️"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
