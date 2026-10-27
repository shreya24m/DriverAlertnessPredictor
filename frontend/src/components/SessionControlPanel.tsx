"use client";

import React, { useState, useEffect, useRef } from "react";
import { type EyeMetrics } from "@/lib/eyeAnalysis";
import { type YawnMetrics } from "@/lib/yawnDetection";
import { type RiskAssessment } from "@/lib/riskEngine";

export interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  durationSec: number;
  avgEar: number;
  avgMar: number;
  peakRisk: number;
  totalBlinks: number;
  blinkRatePerMin: number;
  totalYawns: number;
  drowsyEventsCount: number;
  alarmEventsCount: number;
}

interface SessionControlPanelProps {
  eyeMetrics: EyeMetrics | null;
  yawnMetrics: YawnMetrics | null;
  riskAssessment: RiskAssessment | null;
  onSessionFinish?: (session: SessionData) => void;
  className?: string;
}

export function SessionControlPanel({
  eyeMetrics,
  yawnMetrics,
  riskAssessment,
  onSessionFinish,
  className = "",
}: SessionControlPanelProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>("");

  // Accumulator refs for session statistics
  const earSamplesRef = useRef<number[]>([]);
  const marSamplesRef = useRef<number[]>([]);
  const peakRiskRef = useRef<number>(0);
  const startBlinksRef = useRef<number>(0);
  const startYawnsRef = useRef<number>(0);
  const drowsyEventsCountRef = useRef<number>(0);
  const alarmEventsCountRef = useRef<number>(0);
  const lastDrowsyStateRef = useRef<boolean>(false);
  const lastAlarmLevelRef = useRef<number>(0);
  const startTimeRef = useRef<string>("");

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Sample metrics while recording
  useEffect(() => {
    if (!isRecording) return;

    if (eyeMetrics) {
      earSamplesRef.current.push(eyeMetrics.avgEar);
      if (eyeMetrics.isDrowsyClosure && !lastDrowsyStateRef.current) {
        drowsyEventsCountRef.current++;
      }
      lastDrowsyStateRef.current = eyeMetrics.isDrowsyClosure;
    }

    if (yawnMetrics) {
      marSamplesRef.current.push(yawnMetrics.mar);
    }

    if (riskAssessment) {
      peakRiskRef.current = Math.max(peakRiskRef.current, riskAssessment.riskScore);
      if (
        riskAssessment.alarmLevel > 0 &&
        riskAssessment.alarmLevel !== lastAlarmLevelRef.current &&
        riskAssessment.isEscalated
      ) {
        alarmEventsCountRef.current++;
      }
      lastAlarmLevelRef.current = riskAssessment.alarmLevel;
    }
  }, [isRecording, eyeMetrics, yawnMetrics, riskAssessment]);

  const handleStartSession = () => {
    const id = `sess_${Date.now().toString(36)}`;
    setSessionId(id);
    setDurationSec(0);
    earSamplesRef.current = [];
    marSamplesRef.current = [];
    peakRiskRef.current = 0;
    startBlinksRef.current = eyeMetrics?.blinkCount ?? 0;
    startYawnsRef.current = yawnMetrics?.yawnCount ?? 0;
    drowsyEventsCountRef.current = 0;
    alarmEventsCountRef.current = 0;
    lastDrowsyStateRef.current = false;
    lastAlarmLevelRef.current = 0;
    startTimeRef.current = new Date().toISOString();
    setIsRecording(true);
  };

  const handleStopSession = () => {
    setIsRecording(false);

    const avgEar =
      earSamplesRef.current.length > 0
        ? earSamplesRef.current.reduce((a, b) => a + b, 0) /
          earSamplesRef.current.length
        : eyeMetrics?.avgEar ?? 0.28;

    const avgMar =
      marSamplesRef.current.length > 0
        ? marSamplesRef.current.reduce((a, b) => a + b, 0) /
          marSamplesRef.current.length
        : yawnMetrics?.mar ?? 0.15;

    const blinksInSession = Math.max(
      0,
      (eyeMetrics?.blinkCount ?? 0) - startBlinksRef.current
    );
    const yawnsInSession = Math.max(
      0,
      (yawnMetrics?.yawnCount ?? 0) - startYawnsRef.current
    );

    const minutes = Math.max(durationSec / 60, 0.05);
    const blinkRate = Math.round((blinksInSession / minutes) * 10) / 10;

    const completedSession: SessionData = {
      sessionId,
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      durationSec,
      avgEar: Math.round(avgEar * 1000) / 1000,
      avgMar: Math.round(avgMar * 1000) / 1000,
      peakRisk: peakRiskRef.current,
      totalBlinks: blinksInSession,
      blinkRatePerMin: blinkRate,
      totalYawns: yawnsInSession,
      drowsyEventsCount: drowsyEventsCountRef.current,
      alarmEventsCount: alarmEventsCountRef.current,
    };

    if (onSessionFinish) {
      onSessionFinish(completedSession);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Trip Monitoring Session
            </h3>
            <p className="text-[11px] text-slate-400">
              Record, measure, and analyze continuous driver vigilance
            </p>
          </div>
        </div>

        {/* Live Session Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-mono text-xs ${
              isRecording
                ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isRecording ? "bg-rose-500 animate-ping" : "bg-slate-500"
              }`}
            />
            <span>{isRecording ? "REC" : "READY"}</span>
            <span className="font-bold text-white">{formatTimer(durationSec)}</span>
          </div>

          {/* Start / Stop Session Button */}
          {!isRecording ? (
            <button
              onClick={handleStartSession}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition"
            >
              Start Session
            </button>
          ) : (
            <button
              onClick={handleStopSession}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500 transition"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Live Session Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">
            Duration
          </span>
          <span className="text-base font-bold text-slate-200">
            {formatTimer(durationSec)}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">
            Peak Risk
          </span>
          <span
            className={`text-base font-bold ${
              peakRiskRef.current >= 60
                ? "text-rose-400"
                : peakRiskRef.current >= 30
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {peakRiskRef.current}/100
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">
            Drowsy Closures
          </span>
          <span className="text-base font-bold text-cyan-400">
            {drowsyEventsCountRef.current} events
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">
            Alarms Triggered
          </span>
          <span className="text-base font-bold text-amber-400">
            {alarmEventsCountRef.current} alarms
          </span>
        </div>
      </div>
    </div>
  );
}
