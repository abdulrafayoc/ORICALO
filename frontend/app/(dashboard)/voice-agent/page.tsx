"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

/* ─── Radial Audio Visualizer (themed canvas) ─────────────────── */

function RadialAudioVisualizer({
  analyser,
  state,
  size = 320,
  barCount = 48,
}: {
  analyser: AnalyserNode | null;
  state: VoiceAgentState;
  size?: number;
  barCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const dataArray = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : new Uint8Array(0);
    const radius = size / 2 - 28;
    const color = state === "speaking" ? PALE_HEX : ACCENT_HEX;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (analyser) analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
        const value = dataArray[dataIndex] ?? 0;
        const barHeight =
          state === "speaking" || state === "listening"
            ? (value / 255) * radius * 0.7
            : state === "processing"
              ? Math.sin(Date.now() / 200 + i * 0.5) * 8 + 12
              : 4;

        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.globalAlpha = state === "idle" ? 0.25 : 0.85;
        const barWidth = ((Math.PI * 2 * radius) / barCount) * 0.55;
        ctx.fillRect(-barWidth / 2, radius, barWidth, Math.max(barHeight, 2));
        ctx.restore();
      }

      ctx.restore();
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, state, size, barCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block"
    />
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
            <RadialAudioVisualizer
              analyser={currentAnalyser}
              state={agentState}
              size={320}
              barCount={48}
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
