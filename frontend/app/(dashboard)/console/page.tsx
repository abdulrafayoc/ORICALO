"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  Terminal,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Play,
  Zap,
  Radio,
  Loader2,
  Cookie as CookieIcon,
} from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { apiFetch, WS_BASE } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { runDemoSession } from "@/lib/demo-fixtures";
import { useVoicePresence, type VoiceStatus } from "@/context/voice-presence";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

type AgentState = "idle" | "listening" | "processing" | "speaking" | "error";

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

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

/* ─── Inline status indicator (replaces StatusIndicator component) ─── */

function ConnectionStatus({
  state,
  message,
}: {
  state: ConnectionState;
  message: string;
}) {
  const config: Record<
    ConnectionState,
    { dot: "idle" | "live" | "error"; tone: "neutral" | "mint" | "warning" | "danger"; icon: typeof Radio; pulse?: boolean }
  > = {
    disconnected: { dot: "idle", tone: "neutral", icon: Radio },
    connecting: { dot: "live", tone: "warning", icon: Loader2, pulse: true },
    connected: { dot: "live", tone: "mint", icon: Radio, pulse: true },
    listening: { dot: "live", tone: "mint", icon: Radio, pulse: true },
    processing: { dot: "live", tone: "warning", icon: Loader2, pulse: true },
    speaking: { dot: "live", tone: "mint", icon: Radio, pulse: true },
    error: { dot: "error", tone: "danger", icon: AlertCircle },
  };
  const c = config[state];
  const Icon = c.icon;
  return (
    <div className="flex items-center gap-2">
      <StatusDot state={c.dot} size="sm" className={c.pulse ? "presence-pulse" : ""} />
      <Icon
        className={cn(
          "w-3.5 h-3.5",
          c.tone === "danger" ? "text-destructive" : "text-accent",
          state === "processing" && "animate-spin",
        )}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground max-w-[260px] truncate">
        {message}
      </span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function ConsolePage() {
  const { setStatus: setVoicePresenceStatus } = useVoicePresence();

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [activeWidget, setActiveWidget] = useState<"price" | "rag" | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, unknown> | unknown[] | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [latencySTT, setLatencySTT] = useState<number | null>(null);
  const [latencyAudio, setLatencyAudio] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<{
    duration: number;
    turns: number;
    preview: string;
  } | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const sessionStartRef = useRef(0);
  const tUserStopRef = useRef<number | null>(null);
  const tFirstAgentRef = useRef<number | null>(null);
  const demoCleanupRef = useRef<(() => void) | null>(null);
  const retryRef = useRef(0);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Wire console state → global voice presence so the sidebar BrandMark pulses
  useEffect(() => {
    const map: Record<AgentState, VoiceStatus> = {
      idle: "idle",
      listening: "listening",
      processing: "thinking",
      speaking: "speaking",
      error: "idle",
    };
    setVoicePresenceStatus(map[agentState]);
  }, [agentState, setVoicePresenceStatus]);

  useEffect(() => {
    apiFetch("/agents/")
      .then((r) => r.json())
      .then((d) => {
        const agentsArray = Array.isArray(d) ? d : [];
        setAgents(agentsArray);
        if (agentsArray.length > 0) setSelectedAgentId(agentsArray[0]!.id);
      })
      .catch(console.error);
  }, []);

  const handleServerMessage = useCallback(
    async (msg: Record<string, unknown>) => {
      if (msg.type === "audio_chunk") {
        if (playerRef.current && typeof msg.data === "string") {
          await playerRef.current.enqueue(msg.data);
        }
        if (msg.is_first) {
          if (tFirstAgentRef.current)
            setLatencyAudio(Date.now() - tFirstAgentRef.current);
          setTranscript((p) => [...p, "System: 🔊 Agent speaking…"]);
        }
        return;
      }
      if (msg.type === "audio_end") {
        playerRef.current?.finalize();
        return;
      }
      if (msg.type === "interrupt") {
        playerRef.current?.flush();
        setTranscript((p) => [...p, "System: ⚡ Interrupted"]);
        return;
      }
      if (msg.type === "actions") {
        for (const action of (msg.actions || []) as Array<{
          type: string;
          payload?: Record<string, unknown>;
        }>) {
          if (action.type === "show_price" && action.payload) {
            setActiveWidget("price");
            setWidgetData(action.payload);
          } else if (
            action.type === "show_listings" &&
            action.payload?.listings
          ) {
            setActiveWidget("rag");
            setWidgetData(action.payload.listings as unknown[]);
          }
        }
        return;
      }
      if (msg.type === "status") {
        const map: Record<string, AgentState> = {
          listening: "listening",
          processing: "processing",
          speaking: "speaking",
        };
        setAgentState(map[msg.status as string] ?? "idle");
        const connMap: Record<string, ConnectionState> = {
          listening: "listening",
          processing: "processing",
          speaking: "speaking",
        };
        setConnectionState(connMap[msg.status as string] ?? "connected");
        if (typeof msg.message === "string") setStatusMessage(msg.message);
        return;
      }
      if (msg.type === "transcript") {
        const tok = msg.speaker === "agent" ? "🤖 Agent:" : "🎙️ You:";
        if (msg.speaker === "user" && msg.is_final)
          tUserStopRef.current = Date.now();
        if (msg.speaker === "agent" && msg.is_final && tUserStopRef.current) {
          const now = Date.now();
          setLatencySTT(now - tUserStopRef.current);
          tFirstAgentRef.current = now;
        }
        if (msg.is_final) {
          setTranscript((p) => [...p, `${tok} ${msg.text}`]);
          if (msg.speaker === "agent") setAgentReply(msg.text as string);
        } else {
          setTranscript((p) => {
            const last = p[p.length - 1];
            if (last?.startsWith("🎙️ You:") && !last.includes("✓"))
              return [...p.slice(0, -1), `${tok} ${msg.text}`];
            return [...p, `${tok} ${msg.text}`];
          });
        }
        return;
      }
      if (msg.type === "error") {
        setAgentState("error");
        setConnectionState("error");
        setStatusMessage(`Error · ${msg.message}`);
        setTranscript((p) => [...p, `System: ❌ ${msg.message}`]);
      }
    },
    [],
  );

  const RETRY_DELAYS = [1500, 3000, 6000];

  const handleRetry = useCallback(() => {
    const n = retryRef.current;
    if (n >= 3) {
      setStatusMessage("Max retries reached");
      return;
    }
    retryRef.current = n + 1;
    setRetryCount(n + 1);
    setStatusMessage(
      `Reconnecting in ${RETRY_DELAYS[n]! / 1000}s · ${n + 1}/3`,
    );
    setTimeout(() => startRecording(), RETRY_DELAYS[n]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      setIsConnecting(true);
      setSessionSummary(null);
      sessionStartRef.current = Date.now();
      setTranscript((p) => [...p, "System: 🎤 Microphone access granted"]);

      const ws = new WebSocket(`${WS_BASE}/ws/voice_agent`);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        retryRef.current = 0;
        setRetryCount(0);
        setConnectionState("connected");
        setStatusMessage("Connected · initializing STT");
        setTranscript((p) => [...p, "System: 🔌 Connected to ORICALO backend"]);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        source.connect(analyserNode);
        setAnalyser(analyserNode);

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
        setConnectionState("error");
        setStatusMessage("Connection error");
      };

      ws.onclose = () => {
        setIsConnecting(false);
        setConnectionState("disconnected");
        if (isRecordingRef.current) {
          handleRetry();
        } else {
          setAgentState("idle");
          setStatusMessage("Session ended");
          setTranscript((p) => [...p, "System: 🔌 Connection closed"]);
        }
      };
    } catch {
      setIsConnecting(false);
      setAgentState("error");
      setConnectionState("error");
      setStatusMessage("Microphone access denied");
      setTranscript((p) => [...p, "System: ❌ Microphone access denied"]);
    }
  };

  const stopRecording = () => {
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    isRecordingRef.current = false;
    setIsRecording(false);
    setAgentState("idle");
    setTranscript((p) => [...p, "System: ⏹ Session ended"]);

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

    setConnectionState("disconnected");
    setStatusMessage("Session ended");
    setSessionSummary({
      duration,
      turns: transcript.filter(
        (l) => l.startsWith("🎙️") || l.startsWith("🤖"),
      ).length,
      preview: agentReply ?? "No response generated",
    });
  };

  const runDemo = () => {
    if (isDemoRunning) {
      demoCleanupRef.current?.();
      return;
    }
    setIsDemoRunning(true);
    setSessionSummary(null);
    setActiveWidget(null);
    setLatencySTT(null);
    setLatencyAudio(null);
    setTranscript(["System: 🎬 Demo session started"]);
    setAgentState("listening");
    sessionStartRef.current = Date.now();

    const cancel = runDemoSession((msg) => handleServerMessage(msg));
    demoCleanupRef.current = () => {
      cancel();
      setIsDemoRunning(false);
      setAgentState("idle");
      setStatusMessage("Demo ended");
    };

    setTimeout(() => {
      const dur = Math.round((Date.now() - sessionStartRef.current) / 1000);
      setIsDemoRunning(false);
      setAgentState("idle");
      setSessionSummary({
        duration: dur,
        turns: 4,
        preview: agentReply ?? "Demo complete",
      });
    }, 30000);
  };

  const active = isRecording || isDemoRunning;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-5 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-foreground tracking-tight flex items-center gap-3">
            <Terminal className="w-5 h-5 text-accent" />
            Live console
          </h1>
          <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <StatusDot
                state={active ? "live" : "idle"}
                size="xs"
                className={active ? "presence-pulse" : ""}
              />
              {active ? "session active" : "idle"}
            </span>
            {(latencySTT || latencyAudio) && (
              <span className="flex items-center gap-1 text-accent">
                <Zap className="w-3 h-3" />
                {latencySTT && `STT→Reply ${latencySTT}ms`}
                {latencySTT && latencyAudio && " · "}
                {latencyAudio && `Reply→Audio ${latencyAudio}ms`}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <ConnectionStatus state={connectionState} message={statusMessage} />
          <select
            className="h-9 bg-input border border-border rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            value={selectedAgentId ?? ""}
            onChange={(e) => setSelectedAgentId(Number(e.target.value))}
            disabled={active}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            {agents.length === 0 && (
              <option value="">No agents — run seed script</option>
            )}
          </select>

          <Button
            size="sm"
            variant={isDemoRunning ? "outline" : "ghost"}
            onClick={runDemo}
            disabled={isRecording}
          >
            <Play className="w-4 h-4" />
            {isDemoRunning ? "Stop demo" : "Run demo"}
          </Button>

          <Button
            size="sm"
            variant={isRecording ? "danger" : "primary"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isDemoRunning || isConnecting}
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Connecting…
              </>
            ) : isRecording ? (
              <>
                <Square className="w-4 h-4" /> Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Start session
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 grid grid-cols-12 gap-5 min-h-0">
        {/* Transcript terminal */}
        <Card className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
          <div className="bg-popover border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0">
            <span className="font-mono text-[11px] text-muted-foreground">
              /var/log/transcript.log
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">streaming</Badge>
              <Badge variant="mint">barge-in</Badge>
            </div>
          </div>
          <div className="flex-1 p-5 font-mono text-sm overflow-y-auto space-y-2 bg-card">
            {transcript.length === 0 && (
              <div className="text-muted-foreground italic">
                Waiting for input stream…
              </div>
            )}
            {transcript.map((line, i) => (
              <div key={i} className="break-words flex gap-3">
                <span className="text-muted-foreground/70 shrink-0 select-none text-xs mt-0.5">
                  {new Date().toLocaleTimeString()}
                </span>
                <span
                  className={cn(
                    "font-urdu",
                    line.startsWith("System:") && "text-yellow-400",
                    line.startsWith("🎙️") && "text-foreground",
                    line.startsWith("🤖") && "text-accent",
                    !line.startsWith("System:") &&
                      !line.startsWith("🎙️") &&
                      !line.startsWith("🤖") &&
                      "text-foreground",
                  )}
                >
                  {line}
                </span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </Card>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* State visualizer */}
          <Card
            className={cn(
              "transition-colors duration-300",
              agentState === "error" && "border-destructive/40",
              (agentState === "listening" || agentState === "speaking") &&
                "border-accent/40",
            )}
          >
            <CardBody className="p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
              {agentState === "idle" && !sessionSummary && (
                <>
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center">
                    <Mic className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-center leading-relaxed">
                    Start a session or run the demo
                  </p>
                </>
              )}

              {agentState === "listening" && (
                <>
                  <div className="w-14 h-14 rounded-full border border-accent/60 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border border-accent/30 animate-ping" />
                    <Mic className="w-6 h-6 text-accent" />
                  </div>
                  <div className="w-full h-12">
                    <WaveformVisualizer
                      analyser={analyser}
                      isRecording={active}
                    />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
                    Listening
                  </p>
                </>
              )}

              {agentState === "processing" && (
                <>
                  <div className="flex gap-1.5 items-end h-10">
                    {[16, 24, 20].map((h, i) => (
                      <div
                        key={i}
                        className="w-2 bg-accent rounded-full animate-bounce"
                        style={{ height: h, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
                    Thinking
                  </p>
                </>
              )}

              {agentState === "speaking" && (
                <>
                  <div className="flex gap-1 items-center h-10">
                    {[12, 20, 28, 20, 12].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-accent rounded-full wave-bar"
                        style={{
                          height: h,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
                    Speaking
                  </p>
                  {(latencySTT || latencyAudio) && (
                    <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground text-center space-y-0.5">
                      {latencySTT && (
                        <div>
                          STT→Reply ·{" "}
                          <span className="text-accent">{latencySTT}ms</span>
                        </div>
                      )}
                      {latencyAudio && (
                        <div>
                          Reply→Audio ·{" "}
                          <span className="text-accent">{latencyAudio}ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {agentState === "error" && (
                <>
                  <AlertCircle className="w-9 h-9 text-destructive" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-destructive text-center px-2">
                    {statusMessage}
                  </p>
                  <Button size="sm" variant="danger" onClick={handleRetry}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry · {retryCount}/3
                  </Button>
                </>
              )}

              {agentState === "idle" && sessionSummary && (
                <div className="w-full text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
                  <p className="font-serif text-base text-foreground">
                    Session complete
                  </p>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground space-y-1">
                    <div>
                      Duration ·{" "}
                      <span className="text-foreground">
                        {Math.floor(sessionSummary.duration / 60)}m{" "}
                        {sessionSummary.duration % 60}s
                      </span>
                    </div>
                    <div>
                      Turns ·{" "}
                      <span className="text-foreground">
                        {sessionSummary.turns}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic line-clamp-2 px-2">
                    {sessionSummary.preview}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <a
                      href="/crm"
                      className="px-3 py-1 bg-accent/10 border border-accent/30 text-accent rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-accent/20 transition-colors"
                    >
                      View CRM
                    </a>
                    <button
                      onClick={() => setSessionSummary(null)}
                      className="px-3 py-1 bg-muted text-foreground rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-popover transition-colors"
                    >
                      New session
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Latest response */}
          <Card>
            <CardBody className="p-5 flex flex-col">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">
                Latest response
              </h2>
              <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed font-urdu text-sm">
                {agentReply ?? (
                  <span className="text-muted-foreground italic">
                    No output yet.
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Widget area */}
          {activeWidget && widgetData && (
            <>
              {activeWidget === "price" && (
                <PriceWidget
                  minPrice={(widgetData as Record<string, number>).min_price ?? 0}
                  maxPrice={(widgetData as Record<string, number>).max_price ?? 0}
                  confidence={(widgetData as Record<string, number>).confidence ?? 0}
                />
              )}
              {activeWidget === "rag" && (
                <RagWidget
                  listings={
                    Array.isArray(widgetData)
                      ? (widgetData as never)
                      : ((widgetData as { listings: never }).listings ?? [])
                  }
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
