"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { Mic, Square, RefreshCw, Shield, Globe, Cpu } from "lucide-react";
import { WS_BASE } from "@/lib/api";
import { useVoicePresence, type VoiceStatus } from "@/context/voice-presence";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";

type VoiceAgentState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

// Mint accent (--accent) for canvas drawing
const ACCENT_HEX = "#7fa37f";
const PALE_HEX = "#c4d4b8";

class StreamingAudioPlayer {
  private audioContext: AudioContext;
  private chunks: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private _interrupted = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async enqueue(b64: string) {
    try {
      const str = window.atob(b64);
      const buf = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
      this.chunks.push(buf.buffer);
      if (!this.isPlaying) {
        this._interrupted = false;
        this.playNext();
      }
    } catch (e) {
      console.error("Enqueue error", e);
    }
  }

  private async playNext() {
    if (this._interrupted || !this.chunks.length) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const chunk = this.chunks.shift()!;
    try {
      const decoded = await this.audioContext.decodeAudioData(chunk.slice(0));
      if (this._interrupted) {
        this.isPlaying = false;
        return;
      }
      const src = this.audioContext.createBufferSource();
      src.buffer = decoded;
      src.connect(this.audioContext.destination);
      this.currentSource = src;
      src.onended = () => {
        this.currentSource = null;
        this.playNext();
      };
      src.start(0);
    } catch {
      this.playNext();
    }
  }

  flush() {
    this._interrupted = true;
    this.chunks = [];
    try {
      this.currentSource?.stop();
    } catch {}
    this.currentSource = null;
    this.isPlaying = false;
  }

  finalize() {}
}

/* ─── Voice Orb Visualizer (Edge Lumin — SVG + Framer Motion) ──── */

/**
 * Edge Lumin design — restraint as the statement.
 * The orb's edge stroke is the star: thickens 1.5px → 4.5px and
 * brightens 35% → 95% with voice amplitude. The halo behind blooms,
 * concentric rings glow brighter, core dot pulses. No ripples, no
 * Bezier deformation — the orb stays geometrically perfect; the
 * "liveliness" comes from light intensity scaling dramatically with
 * the user's voice.
 *
 * States:
 *  - idle / error: muted edge, faint halo, static core
 *  - listening:    breathing loop + dramatic edge reactivity to user voice
 *  - processing:   inner ring becomes a rotating dasharray (5s linear)
 *  - speaking:     same edge reactivity, color shifts to pale sage
 */
function VoiceOrb({
  analyser,
  state,
  size = 320,
}: {
  analyser: AnalyserNode | null;
  state: VoiceAgentState;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const amplitude = useMotionValue(0);

  // Motion values driven by amplitude
  const orbScale = useMotionValue(1);
  const edgeStrokeWidth = useMotionValue(1.5);
  const edgeOpacity = useMotionValue(0.35);
  const edgeRadius = useMotionValue(size * 0.18 + 2);
  const haloOpacity = useMotionValue(0.18);
  const haloScale = useMotionValue(1);
  const coreScale = useMotionValue(1);
  const middleRingOpacity = useMotionValue(0.12);
  const middleRingScale = useMotionValue(1);
  const outerRingOpacity = useMotionValue(0.06);
  const outerRingScale = useMotionValue(1);
  const rafRef = useRef<number | undefined>(undefined);

  const center = size / 2;
  const orbRadius = size * 0.18;
  const ringRadii = [size * 0.27, size * 0.36, size * 0.45];
  const isActive = state !== "idle" && state !== "error";

  // Read analyser → smoothed amplitude (asymmetric: fast attack, slow decay)
  useEffect(() => {
    if (!analyser || reduceMotion) {
      amplitude.set(0);
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let smoothed = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      const slice = Math.min(64, data.length);
      for (let i = 0; i < slice; i++) sum += (data[i]! / 255) ** 2;
      const rms = Math.sqrt(sum / slice);

      // Asymmetric envelope — peaks hit immediately, slow release
      if (rms > smoothed) {
        smoothed = smoothed * 0.45 + rms * 0.55; // attack
      } else {
        smoothed = smoothed * 0.88 + rms * 0.12; // release (hold the peak)
      }

      // Pre-amplify: real-world speech RMS rarely exceeds ~0.5,
      // boost so the orb actually flies on normal voice
      const boosted = Math.min(1, smoothed * 1.85);
      amplitude.set(boosted);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, amplitude, reduceMotion]);

  // Drive every visual property from amplitude + state — aggressive coefficients
  useEffect(() => {
    const unsubscribe = amplitude.on("change", (v) => {
      const idle = state === "idle" || state === "error";

      // Orb scale — punches noticeably
      orbScale.set(idle ? 1 : 1 + v * 0.3);

      // Edge ring — THE star: width + opacity + radius all push hard
      edgeStrokeWidth.set(idle ? 1.2 : 1.5 + v * 6);
      edgeOpacity.set(idle ? 0.25 : 0.4 + v * 0.6);
      // Radius EXPANDS outward with voice — peaks push the ring out by ~14px
      edgeRadius.set(orbRadius + 2 + v * 14);

      // Halo — full bloom
      haloOpacity.set(idle ? 0.05 : 0.2 + v * 0.95);
      haloScale.set(idle ? 1 : 1 + v * 0.7);

      // Core dot — pronounced heartbeat
      coreScale.set(idle ? 1 : 1 + v * 3.5);

      // Concentric ambient rings — brighten + push outward on peaks
      middleRingOpacity.set(idle ? 0.08 : 0.12 + v * 0.55);
      middleRingScale.set(idle ? 1 : 1 + v * 0.12);
      outerRingOpacity.set(idle ? 0.04 : 0.06 + v * 0.4);
      outerRingScale.set(idle ? 1 : 1 + v * 0.08);
    });
    return unsubscribe;
  }, [
    amplitude,
    state,
    orbScale,
    edgeStrokeWidth,
    edgeOpacity,
    edgeRadius,
    haloOpacity,
    haloScale,
    coreScale,
    middleRingOpacity,
    middleRingScale,
    outerRingOpacity,
    outerRingScale,
    orbRadius,
  ]);

  // Breathing loop for listening state (organic baseline motion)
  useEffect(() => {
    if (state !== "listening" || reduceMotion) return;
    const breathe = animate(orbScale, [1, 1.04, 1], {
      duration: 3.2,
      ease: "easeInOut",
      repeat: Infinity,
    });
    return () => breathe.stop();
  }, [state, reduceMotion, orbScale]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          {/* Central orb fill — soft mint glow */}
          <radialGradient id="orb-fill-mint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT_HEX} stopOpacity="0.6" />
            <stop offset="60%" stopColor={ACCENT_HEX} stopOpacity="0.2" />
            <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity="0" />
          </radialGradient>
          {/* Speaking state — pale sage */}
          <radialGradient id="orb-fill-sage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PALE_HEX} stopOpacity="0.7" />
            <stop offset="60%" stopColor={PALE_HEX} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity="0" />
          </radialGradient>
          {/* Halo gradient — wide soft bloom */}
          <radialGradient id="halo-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT_HEX} stopOpacity="0.5" />
            <stop offset="55%" stopColor={ACCENT_HEX} stopOpacity="0.12" />
            <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-fill-speaking" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PALE_HEX} stopOpacity="0.55" />
            <stop offset="55%" stopColor={PALE_HEX} stopOpacity="0.14" />
            <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity="0" />
          </radialGradient>
          {/* Soft gaussian blur for the halo */}
          <filter id="halo-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* ── Ambient halo (blurred, blooms with amplitude) ────────── */}
        <motion.circle
          cx={center}
          cy={center}
          r={orbRadius * 1.9}
          fill={
            state === "speaking" ? "url(#halo-fill-speaking)" : "url(#halo-fill)"
          }
          filter="url(#halo-blur)"
          style={{
            opacity: haloOpacity,
            scale: haloScale,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />

        {/* ── Outer ambient ring (scales subtly with voice) ────────── */}
        <motion.circle
          cx={center}
          cy={center}
          r={ringRadii[2]}
          fill="none"
          stroke={ACCENT_HEX}
          strokeWidth={0.8}
          style={{
            opacity: outerRingOpacity,
            scale: outerRingScale,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />

        {/* ── Middle ambient ring (scales subtly with voice) ───────── */}
        <motion.circle
          cx={center}
          cy={center}
          r={ringRadii[1]}
          fill="none"
          stroke={ACCENT_HEX}
          strokeWidth={0.8}
          style={{
            opacity: middleRingOpacity,
            scale: middleRingScale,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />

        {/* ── Thinking-state rotating dasharray (replaces edge ring) ─ */}
        {state === "processing" && !reduceMotion && (
          <motion.circle
            cx={center}
            cy={center}
            r={ringRadii[0]}
            fill="none"
            stroke={ACCENT_HEX}
            strokeWidth={1.5}
            strokeDasharray={`${ringRadii[0]! * 0.8} ${ringRadii[0]! * 5.5}`}
            style={{
              opacity: 0.55,
              transformOrigin: "center",
              transformBox: "fill-box",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 5, ease: "linear", repeat: Infinity }}
          />
        )}

        {/* ── Orb fill — soft inner glow ───────────────────────────── */}
        <motion.circle
          cx={center}
          cy={center}
          r={orbRadius}
          fill={
            state === "speaking" ? "url(#orb-fill-sage)" : "url(#orb-fill-mint)"
          }
          style={{
            scale: orbScale,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
          animate={{ opacity: isActive ? 1 : 0.45 }}
          transition={{ duration: 0.4 }}
        />

        {/* ── Edge ring — THE STAR of Edge Lumin ───────────────────── */}
        {/* Stroke width, opacity, AND radius all push outward with voice */}
        {state !== "processing" && (
          <motion.circle
            cx={center}
            cy={center}
            fill="none"
            stroke={state === "speaking" ? PALE_HEX : ACCENT_HEX}
            style={{
              r: edgeRadius,
              strokeWidth: edgeStrokeWidth,
              opacity: edgeOpacity,
            }}
          />
        )}

        {/* ── Core dot — heartbeat ─────────────────────────────────── */}
        <motion.circle
          cx={center}
          cy={center}
          r={3}
          fill={state === "speaking" ? PALE_HEX : ACCENT_HEX}
          style={{
            scale: coreScale,
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
          animate={{ opacity: isActive ? 0.95 : 0.4 }}
          transition={{ duration: 0.3 }}
        />
      </svg>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function VoiceAgentPage() {
  const { setStatus, setAmplitude } = useVoicePresence();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentState, setAgentState] = useState<VoiceAgentState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to start");
  const [retryCount, setRetryCount] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);
  const isRecordingRef = useRef(false);
  const retryRef = useRef(0);
  const amplitudeRafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ── Voice-presence wiring ──────────────────────────────────────
  // Map page state → global presence so the sidebar BrandMark pulses
  useEffect(() => {
    const map: Record<VoiceAgentState, VoiceStatus> = {
      idle: "idle",
      connecting: "thinking",
      listening: "listening",
      processing: "thinking",
      speaking: "speaking",
      error: "idle",
    };
    setStatus(map[agentState]);
  }, [agentState, setStatus]);

  // Drive amplitude on the active analyser, throttled at ~30fps
  useEffect(() => {
    const currentAnalyser =
      agentState === "speaking" ? outputAnalyser : analyser;
    if (!currentAnalyser || agentState === "idle" || agentState === "error") {
      setAmplitude(0);
      return;
    }
    const data = new Uint8Array(currentAnalyser.frequencyBinCount);
    let lastUpdate = 0;
    const FRAME_MS = 33;

    const loop = (t: number) => {
      amplitudeRafRef.current = requestAnimationFrame(loop);
      if (t - lastUpdate < FRAME_MS) return;
      lastUpdate = t;
      currentAnalyser.getByteFrequencyData(data);
      // Take RMS of low/mid band
      let sum = 0;
      const slice = Math.min(64, data.length);
      for (let i = 0; i < slice; i++) sum += (data[i]! / 255) ** 2;
      const rms = Math.sqrt(sum / slice);
      setAmplitude(Math.min(1, rms * 1.6));
    };
    amplitudeRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (amplitudeRafRef.current)
        cancelAnimationFrame(amplitudeRafRef.current);
    };
  }, [analyser, outputAnalyser, agentState, setAmplitude]);

  // ── Server message handler ─────────────────────────────────────
  const handleServerMessage = useCallback(async (msg: Record<string, unknown>) => {
    if (msg.type === "audio_chunk") {
      if (playerRef.current && typeof msg.data === "string") {
        await playerRef.current.enqueue(msg.data);
      }
      if (msg.is_first) setAgentState("speaking");
      return;
    }
    if (msg.type === "audio_end") {
      playerRef.current?.finalize();
      setAgentState("listening");
      return;
    }
    if (msg.type === "interrupt") {
      playerRef.current?.flush();
      setAgentState("listening");
      return;
    }
    if (msg.type === "status") {
      const map: Record<string, VoiceAgentState> = {
        listening: "listening",
        processing: "processing",
        speaking: "speaking",
      };
      setAgentState(map[msg.status as string] ?? "idle");
      if (typeof msg.message === "string") setStatusMessage(msg.message);
      return;
    }
    if (msg.type === "error") {
      setAgentState("error");
      setStatusMessage(`Error · ${msg.message}`);
    }
  }, []);

  const RETRY_DELAYS = [1500, 3000, 6000];

  const handleRetry = useCallback(() => {
    const n = retryRef.current;
    if (n >= 3) {
      setStatusMessage("Max retries reached");
      return;
    }
    retryRef.current = n + 1;
    setRetryCount(n + 1);
    setStatusMessage(`Reconnecting in ${RETRY_DELAYS[n]! / 1000}s · ${n + 1}/3`);
    setTimeout(() => startRecording(), RETRY_DELAYS[n]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      setIsConnecting(true);
      setStatusMessage("Connecting to voice agent…");
      setAgentState("connecting");

      const ws = new WebSocket(`${WS_BASE}/ws/voice_agent`);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        retryRef.current = 0;
        setRetryCount(0);
        setAgentState("listening");
        setStatusMessage("Connected · listening");

        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        source.connect(analyserNode);
        setAnalyser(analyserNode);

        const outputAnalyserNode = audioContext.createAnalyser();
        outputAnalyserNode.fftSize = 2048;
        setOutputAnalyser(outputAnalyserNode);

        playerRef.current = new StreamingAudioPlayer(audioContext);

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]!));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const bytes = new Uint8Array(pcm.buffer);
          const b64 = btoa(
            bytes.reduce((d, b) => d + String.fromCharCode(b), ""),
          );
          ws.send(
            JSON.stringify({
              type: "audio",
              data: b64,
              format: "pcm_s16le",
              sampleRate: 16000,
            }),
          );
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        (streamRef.current as unknown as { _audioContext?: AudioContext })._audioContext = audioContext;
        (streamRef.current as unknown as { _processor?: ScriptProcessorNode })._processor = processor;
      };

      ws.onmessage = async (e) => handleServerMessage(JSON.parse(e.data));

      ws.onerror = () => {
        setIsConnecting(false);
        setAgentState("error");
        setStatusMessage("Connection error");
      };

      ws.onclose = () => {
        setIsConnecting(false);
        if (isRecordingRef.current) {
          handleRetry();
        } else {
          setAgentState("idle");
          setStatusMessage("Session ended");
        }
      };
    } catch {
      setIsConnecting(false);
      setAgentState("error");
      setStatusMessage("Microphone access denied");
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setAgentState("idle");
    setStatusMessage("Session ended");

    if (playerRef.current) {
      playerRef.current.flush();
      playerRef.current = null;
    }
    if (streamRef.current) {
      const refAny = streamRef.current as unknown as {
        _audioContext?: AudioContext;
        _processor?: ScriptProcessorNode;
      };
      refAny._processor?.disconnect();
      if (refAny._audioContext && refAny._audioContext.state !== "closed")
        refAny._audioContext.close();
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setAnalyser(null);
    setOutputAnalyser(null);
  };

  const currentAnalyser =
    agentState === "speaking" ? outputAnalyser : analyser;

  const stateLabel: Record<VoiceAgentState, string> = {
    idle: "idle",
    connecting: "connecting",
    listening: "listening",
    processing: "thinking",
    speaking: "speaking",
    error: "error",
  };

  const stateHint: Record<VoiceAgentState, string> = {
    idle: "Click below to start a live conversation with the agent.",
    connecting: "Establishing secure WebSocket connection…",
    listening: "Agent is listening. Speak in Urdu or English.",
    processing: "Processing your request and querying the knowledge base.",
    speaking: "Agent is responding in fluent Urdu.",
    error: "Connection interrupted. Please retry.",
  };

  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center gap-12 max-w-3xl w-full">
        {/* Header */}
        <div className="text-center space-y-5 max-w-2xl">
          <Badge variant="mint" className="inline-flex items-center gap-2 px-2.5 py-1">
            <StatusDot state="live" size="xs" />
            Live voice intelligence
          </Badge>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground tracking-tight leading-[1.05]">
            Urdu voice <span className="text-accent italic">AI agent</span>
          </h1>
          <p className="text-muted-foreground">
            Stream your microphone directly to the ORICALO engine. Sub-second
            response in native Urdu.
          </p>
        </div>

        {/* Visualizer */}
        <Card className="relative overflow-hidden">
          <CardBody className="p-10 md:p-12 flex flex-col items-center gap-6 relative">
            <div
              className={cn(
                "absolute inset-0 -z-10 transition-opacity duration-700",
                agentState === "idle" ? "opacity-0" : "opacity-100",
              )}
              style={{
                background:
                  "radial-gradient(circle at center, rgba(127,163,127,0.10), transparent 65%)",
              }}
            />
            <VoiceOrb
              analyser={currentAnalyser}
              state={agentState}
              size={320}
            />

            <div className="flex items-center gap-2">
              <StatusDot
                state={
                  agentState === "error"
                    ? "error"
                    : agentState === "idle"
                      ? "idle"
                      : "live"
                }
                size="sm"
                className={
                  agentState !== "idle" && agentState !== "error"
                    ? "presence-pulse"
                    : undefined
                }
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {stateLabel[agentState]} · {statusMessage}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Controls */}
        <div className="flex flex-col items-center gap-5 w-full max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground text-center leading-relaxed">
            {stateHint[agentState]}
          </p>

          <div className="flex gap-3 w-full">
            <Button
              size="lg"
              variant={isRecording ? "danger" : "primary"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Connecting…
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-4 h-4" /> End session
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Start demo
                </>
              )}
            </Button>

            {agentState === "error" && (
              <Button size="lg" variant="outline" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            )}
          </div>

          {retryCount > 0 && agentState !== "error" && (
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Retried {retryCount}/3
            </div>
          )}

          {/* Trust line */}
          <div className="flex items-center gap-5 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> E2E encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Urdu native
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Groq inference
            </span>
          </div>
        </div>

        {/* Brand mark stamp */}
        <div className="opacity-40">
          <BrandMark size={24} />
        </div>
      </div>
    </div>
  );
}
