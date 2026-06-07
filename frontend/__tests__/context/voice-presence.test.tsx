import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { useEffect } from "react";
import {
  VoicePresenceProvider,
  useVoicePresence,
  type VoiceStatus,
} from "@/context/voice-presence";

function Capture({ onCapture }: { onCapture: (v: ReturnType<typeof useVoicePresence>) => void }) {
  const v = useVoicePresence();
  useEffect(() => { onCapture(v); }, [v, onCapture]);
  return null;
}

describe("VoicePresenceProvider — contract", () => {
  it("exposes { status, amplitude, setStatus, setAmplitude }", () => {
    let captured: ReturnType<typeof useVoicePresence> | null = null;
    render(
      <VoicePresenceProvider>
        <Capture onCapture={(v) => (captured = v)} />
      </VoicePresenceProvider>,
    );
    expect(captured).not.toBeNull();
    expect(captured!.status).toBe("idle");
    expect(typeof captured!.amplitude).toBe("number");
    expect(typeof captured!.setStatus).toBe("function");
    expect(typeof captured!.setAmplitude).toBe("function");
  });

  it("state transitions: idle → listening → thinking → speaking → idle", () => {
    let captured: ReturnType<typeof useVoicePresence> | null = null;
    render(
      <VoicePresenceProvider>
        <Capture onCapture={(v) => (captured = v)} />
      </VoicePresenceProvider>,
    );
    const sequence: VoiceStatus[] = ["listening", "thinking", "speaking", "idle"];
    for (const next of sequence) {
      act(() => captured!.setStatus(next));
      expect(captured!.status).toBe(next);
    }
  });

  it("amplitude clamps to [0, 1]", () => {
    let captured: ReturnType<typeof useVoicePresence> | null = null;
    render(
      <VoicePresenceProvider>
        <Capture onCapture={(v) => (captured = v)} />
      </VoicePresenceProvider>,
    );
    act(() => captured!.setAmplitude(2.5));
    expect(captured!.amplitude).toBe(1);
    act(() => captured!.setAmplitude(-1));
    expect(captured!.amplitude).toBe(0);
    act(() => captured!.setAmplitude(0.42));
    expect(captured!.amplitude).toBeCloseTo(0.42, 5);
  });

  it("useVoicePresence throws helpful error outside provider", () => {
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() =>
        render(<Capture onCapture={() => {}} />)
      ).toThrow(/VoicePresenceProvider/);
    } finally {
      console.error = orig;
    }
  });
});
