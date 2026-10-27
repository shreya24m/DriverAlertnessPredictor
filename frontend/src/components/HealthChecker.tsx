"use client";

import React, { useState, useEffect } from "react";

interface HealthData {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export function HealthChecker() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/health`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to backend service"
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              health
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : error
                ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Backend API Health Status
          </h3>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Re-check"}
        </button>
      </div>

      <div className="rounded-lg bg-slate-950/80 p-3 font-mono text-xs">
        {loading && !health ? (
          <p className="text-slate-400">Pinging {apiUrl}/health ...</p>
        ) : health ? (
          <div className="space-y-1">
            <p className="text-emerald-400 font-semibold">
              ✓ Connection Successful
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Service:</span> {health.service}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Status:</span> {health.status}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Version:</span> {health.version}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Environment:</span>{" "}
              {health.environment}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-rose-400 font-semibold">
              ✗ Backend Offline / Unreachable
            </p>
            <p className="text-slate-400">{error}</p>
            <p className="text-slate-500 text-[11px] mt-2">
              Start the backend with:{" "}
              <code className="text-cyan-400">
                uvicorn app.main:app --reload --port 8000
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
