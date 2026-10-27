"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AlarmLevel } from "@/lib/riskEngine";

export interface UseAlarmReturn {
  isMuted: boolean;
  toggleMute: () => void;
  playAlertTone: () => void;
  playCriticalTone: () => void;
  stopAlarmSound: () => void;
  testAlarm: (level: AlarmLevel) => void;
}

export function useAlarm(currentLevel: AlarmLevel = AlarmLevel.OK): UseAlarmReturn {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const criticalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const criticalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements and AudioContext lazily
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        alertAudioRef.current = new Audio("/sounds/alert.wav");
        criticalAudioRef.current = new Audio("/sounds/critical.wav");
        criticalAudioRef.current.loop = true;
      } catch {
        // Fall back to Web Audio API synthesis
      }
    }

    return () => {
      stopAlarmSound();
    };
  }, []);

  // Web Audio API Synthesizer fallback
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playSynthesizedTone = useCallback(
    (freq: number, durationSec: number, type: OscillatorType = "sine") => {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + durationSec);
      } catch {
        // Ignore audio playback exceptions if blocked
      }
    },
    [isMuted, getAudioContext]
  );

  // Level 2 Alert Tone: dual beep chime
  const playAlertTone = useCallback(() => {
    if (isMuted) return;

    if (alertAudioRef.current) {
      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(() => {
        // Fallback to Web Audio synthesis
        playSynthesizedTone(880, 0.15);
        setTimeout(() => playSynthesizedTone(1046, 0.2), 180);
      });
    } else {
      playSynthesizedTone(880, 0.15);
      setTimeout(() => playSynthesizedTone(1046, 0.2), 180);
    }
  }, [isMuted, playSynthesizedTone]);

  // Level 3 Critical Tone: repeating siren
  const playCriticalTone = useCallback(() => {
    if (isMuted) return;

    if (criticalAudioRef.current) {
      criticalAudioRef.current.currentTime = 0;
      criticalAudioRef.current.play().catch(() => {
        // Fallback to repeating synthesis
        if (!criticalIntervalRef.current) {
          playSynthesizedTone(988, 0.25, "sawtooth");
          criticalIntervalRef.current = setInterval(() => {
            playSynthesizedTone(784, 0.25, "sawtooth");
            setTimeout(() => playSynthesizedTone(988, 0.25, "sawtooth"), 280);
          }, 600);
        }
      });
    } else if (!criticalIntervalRef.current) {
      playSynthesizedTone(988, 0.25, "sawtooth");
      criticalIntervalRef.current = setInterval(() => {
        playSynthesizedTone(784, 0.25, "sawtooth");
        setTimeout(() => playSynthesizedTone(988, 0.25, "sawtooth"), 280);
      }, 600);
    }
  }, [isMuted, playSynthesizedTone]);

  const stopAlarmSound = useCallback(() => {
    if (criticalAudioRef.current) {
      criticalAudioRef.current.pause();
      criticalAudioRef.current.currentTime = 0;
    }
    if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
    if (criticalIntervalRef.current) {
      clearInterval(criticalIntervalRef.current);
      criticalIntervalRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stopAlarmSound();
      }
      return next;
    });
  }, [stopAlarmSound]);

  const testAlarm = useCallback(
    (level: AlarmLevel) => {
      stopAlarmSound();
      if (level === AlarmLevel.ALERT) {
        playAlertTone();
      } else if (level === AlarmLevel.CRITICAL) {
        playCriticalTone();
        // Auto stop test after 2.5 seconds
        setTimeout(() => stopAlarmSound(), 2500);
      }
    },
    [playAlertTone, playCriticalTone, stopAlarmSound]
  );

  // Escalate / de-escalate audio responses based on active alarmLevel
  useEffect(() => {
    if (isMuted) {
      stopAlarmSound();
      return;
    }

    if (currentLevel === AlarmLevel.CRITICAL) {
      playCriticalTone();
    } else if (currentLevel === AlarmLevel.ALERT) {
      stopAlarmSound();
      playAlertTone();
    } else {
      // Level 0 or 1 (silent / banner only)
      stopAlarmSound();
    }
  }, [currentLevel, isMuted, playAlertTone, playCriticalTone, stopAlarmSound]);

  return {
    isMuted,
    toggleMute,
    playAlertTone,
    playCriticalTone,
    stopAlarmSound,
    testAlarm,
  };
}
