"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

export interface VoicePresenceValue {
  status: VoiceStatus;
  amplitude: number;
  setStatus: (s: VoiceStatus) => void;
  setAmplitude: (a: number) => void;
}

const VoicePresenceContext = createContext<VoicePresenceValue | null>(null);

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function VoicePresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatusState] = useState<VoiceStatus>("idle");
  const [amplitude, setAmplitudeState] = useState(0);
  const rafRef = useRef<number | null>(null);

  const setStatus = useCallback((next: VoiceStatus) => {
    setStatusState(next);
    if (next === "idle") {
      setAmplitudeState(0);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, []);

  const setAmplitude = useCallback((a: number) => {
    setAmplitudeState(clamp01(a));
  }, []);

  const value = useMemo<VoicePresenceValue>(
    () => ({ status, amplitude, setStatus, setAmplitude }),
    [status, amplitude, setStatus, setAmplitude],
  );

  return (
    <VoicePresenceContext.Provider value={value}>
      {children}
    </VoicePresenceContext.Provider>
  );
}

export function useVoicePresence(): VoicePresenceValue {
  const ctx = useContext(VoicePresenceContext);
  if (!ctx) {
    throw new Error(
      "useVoicePresence must be used inside a VoicePresenceProvider",
    );
  }
  return ctx;
}
