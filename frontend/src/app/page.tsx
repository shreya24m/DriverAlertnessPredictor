import { HealthChecker } from "@/components/HealthChecker";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-800/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-xl">🚗</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              DriveAware <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-xs text-slate-400">
              Driver Drowsiness & Alertness Monitoring Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Milestone M1: Project Skeleton Active
          </span>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Project Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-widest font-semibold text-cyan-400">
              Computer Vision & Edge Safety
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Intelligent Real-Time Driver Vigilance Detection
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              DriveAware AI analyzes facial landmarks directly inside your
              browser with zero video transmission. Using mathematical Eye Aspect
              Ratio (EAR), Mouth Aspect Ratio (MAR), and rolling PERCLOS
              windows, it calculates proactive risk scores and triggers
              escalating alerts before fatigue becomes dangerous.
            </p>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-cyan-400 font-bold text-sm mb-1">
                👁️ Eye Analysis (EAR & PERCLOS)
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Detects micro-sleeps (&gt;0.5s closure), blink frequency, and 60-second
                cumulative PERCLOS percentage.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-cyan-400 font-bold text-sm mb-1">
                🥱 Yawn Detection (MAR)
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Differentiates natural conversational movement from deep yawning
                spans (&gt;1.5s open mouth).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-cyan-400 font-bold text-sm mb-1">
                🛡️ Edge Privacy First
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                MediaPipe runs 100% client-side in WebAssembly. Raw camera video
                never leaves the driver&apos;s device.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-cyan-400 font-bold text-sm mb-1">
                🚨 Escalating Alarm System
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Four-tier graduated response (Level 0 OK to Level 3 Critical)
                with built-in hysteresis to prevent flickering.
              </p>
            </div>
          </div>

          {/* Roadmap Progress */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Milestone Roadmap Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-medium">
                <span>✓ M1: Project Skeleton & Architecture</span>
                <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded">
                  Completed
                </span>
              </div>
              <div className="flex items-center justify-between text-cyan-400">
                <span>➔ M2: Real-time Webcam & MediaPipe Face Mesh</span>
                <span className="text-[11px] bg-cyan-500/20 px-2 py-0.5 rounded">
                  Next Milestone
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>○ M3-M6: EAR/MAR, Risk Engine, Interactive Dashboard</span>
                <span>Queued</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>○ M7-M12: Auth, Reports, Evaluation & Deployment</span>
                <span>Queued</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Backend Health & Developer Controls */}
        <div className="lg:col-span-5 space-y-6">
          <HealthChecker />

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
              Quick Development Commands
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <p className="text-slate-400 text-[11px] mb-1">Start Backend:</p>
                <code className="block bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300 overflow-x-auto">
                  cd backend &amp;&amp; uvicorn app.main:app --reload --port 8000
                </code>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] mb-1">Run Backend Tests:</p>
                <code className="block bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300 overflow-x-auto">
                  cd backend &amp;&amp; pytest
                </code>
              </div>
              <div>
                <p className="text-slate-400 text-[11px] mb-1">Start Frontend:</p>
                <code className="block bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300 overflow-x-auto">
                  cd frontend &amp;&amp; npm run dev
                </code>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>DriveAware AI &bull; Milestone M1 Skeleton</p>
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            Backend Swagger Docs
          </a>
          <span>&bull;</span>
          <a
            href="http://localhost:8000/health"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            Health Endpoint
          </a>
        </div>
      </footer>
    </div>
  );
}
