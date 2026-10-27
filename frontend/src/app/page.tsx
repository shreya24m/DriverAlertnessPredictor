"use client";

import React, { useState } from "react";
import { WebcamFeed } from "@/components/WebcamFeed";
import { HealthChecker } from "@/components/HealthChecker";
import { type NormalizedLandmark } from "@/lib/landmarks";

export default function Home() {
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [landmarkCount, setLandmarkCount] = useState<number>(0);

  const handleLandmarksUpdate = (
    landmarks: NormalizedLandmark[],
    hasFace: boolean
  ) => {
    setFaceDetected(hasFace);
    setLandmarkCount(landmarks.length);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-xl">🚗</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              DriveAware <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-xs text-slate-400">
              Driver Vigilance &amp; Drowsiness Detection Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Milestone M2: Real-Time Vision Monitoring Active
          </span>
        </div>
      </header>

      {/* Main Vision Monitoring Grid */}
      <main className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Webcam Feed & Vision Stream (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👁️</span> Real-Time Face Mesh Tracking
            </h2>
            <p className="text-xs text-slate-400">
              MediaPipe Face Mesh running client-side at 15-30+ FPS. Raw video
              remains strictly private in browser memory.
            </p>
          </div>

          <WebcamFeed onLandmarksUpdate={handleLandmarksUpdate} />

          {/* Quick Monitoring Telemetry Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Vision Status
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-1.5 ${
                  faceDetected ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {faceDetected ? "Tracking" : "Searching"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Landmarks
              </span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {landmarkCount} pts
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Privacy Mode
              </span>
              <span className="text-sm font-bold text-slate-200">
                100% On-Device
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Platform State, Backend Health & Roadmap (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <HealthChecker />

          {/* Milestone Progress */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Implementation Roadmap
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-medium">
                <span>✓ M1: Project Skeleton &amp; Architecture</span>
                <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded">
                  Done
                </span>
              </div>
              <div className="flex items-center justify-between text-cyan-300 font-semibold bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20">
                <span>➔ M2: Live Webcam &amp; Face Mesh Overlay</span>
                <span className="text-[11px] bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                  Active (15+ FPS)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>○ M3: Eye-Closure &amp; Blink Analysis (EAR &amp; PERCLOS)</span>
                <span className="text-[11px] text-slate-500">Next Milestone</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>○ M4: Yawn Detection (MAR)</span>
                <span>Queued</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>○ M5: Risk Score &amp; Escalating Alarms</span>
                <span>Queued</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>○ M6-M12: Dashboard, Auth, Reports, Evaluation</span>
                <span>Queued</span>
              </div>
            </div>
          </div>

          {/* Quick Diagnostics */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 font-mono text-xs text-slate-400">
            <div className="flex justify-between">
              <span>WASM Engine:</span>
              <span className="text-slate-200">MediaPipe SIMD WebAssembly</span>
            </div>
            <div className="flex justify-between">
              <span>Model Delegate:</span>
              <span className="text-slate-200">WebGL GPU / CPU Fallback</span>
            </div>
            <div className="flex justify-between">
              <span>Face Topology:</span>
              <span className="text-slate-200">478 Normalized Points</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>DriveAware AI &bull; Milestone M2 Active</p>
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            Backend API Docs
          </a>
          <span>&bull;</span>
          <a
            href="http://localhost:8000/api/v1/config/thresholds"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            Central Thresholds
          </a>
        </div>
      </footer>
    </div>
  );
}
