/**
 * API client helper for backend communication.
 * Privacy rule: Only numerical metrics, risk, and events are transmitted. Video never leaves browser.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SessionPayload {
  duration_sec: number;
  avg_ear: number;
  avg_mar: number;
  peak_risk: number;
  total_blinks: number;
  blink_rate_per_min: number;
  total_yawns: number;
  drowsy_events_count: number;
  alarm_events_count: number;
  start_time?: string;
  end_time?: string;
  events?: {
    timestamp_sec: number;
    event_type: string;
    risk_score: number;
    details?: string;
  }[];
}

export interface SavedSession {
  id: string;
  user_email?: string;
  start_time: string;
  end_time?: string;
  duration_sec: number;
  avg_ear: number;
  avg_mar: number;
  peak_risk: number;
  total_blinks: number;
  blink_rate_per_min: number;
  total_yawns: number;
  drowsy_events_count: number;
  alarm_events_count: number;
  created_at: string;
  events?: {
    id: string;
    session_id: string;
    timestamp_sec: number;
    event_type: string;
    risk_score: number;
    details?: string;
    created_at: string;
  }[];
}

/**
 * Save completed driving vigilance session metrics to backend.
 */
export async function saveSession(payload: SessionPayload): Promise<SavedSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed to persist session to backend:", err);
    return null;
  }
}

/**
 * Fetch list of saved driving sessions.
 */
export async function listSessions(): Promise<SavedSession[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sessions`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch sessions from backend:", err);
    return [];
  }
}

/**
 * Delete a saved session.
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, {
      method: "DELETE",
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Get direct URL for downloading session PDF report.
 */
export function getReportDownloadUrl(sessionId: string): string {
  return `${API_BASE}/api/v1/reports/${sessionId}`;
}
