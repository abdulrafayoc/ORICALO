"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Terminal, AlertCircle, CheckCircle2, RefreshCw, Play, Zap } from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { StatusIndicator, type ModelStatus } from "@/components/StatusIndicator";
import { apiFetch, WS_BASE } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { runDemoSession } from "@/lib/demo-fixtures";

type AgentState = "idle" | "listening" | "processing" | "speaking" | "error";

class StreamingAudioPlayer {
    private audioContext: AudioContext;
    private chunks: ArrayBuffer[] = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;
    private _interrupted = false;

    constructor(audioContext: AudioContext) { this.audioContext = audioContext; }

    async enqueue(b64: string) {
        try {
            const str = window.atob(b64);
            const buf = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
            this.chunks.push(buf.buffer);
            if (!this.isPlaying) { this._interrupted = false; this.playNext(); }
        } catch (e) { console.error("Enqueue error", e); }
    }

    private async playNext() {
        if (this._interrupted || !this.chunks.length) { this.isPlaying = false; return; }
        this.isPlaying = true;
        const chunk = this.chunks.shift()!;
        try {
            const decoded = await this.audioContext.decodeAudioData(chunk.slice(0));
            if (this._interrupted) { this.isPlaying = false; return; }
            const src = this.audioContext.createBufferSource();
            src.buffer = decoded;
            src.connect(this.audioContext.destination);
            this.currentSource = src;
            src.onended = () => { this.currentSource = null; this.playNext(); };
            src.start(0);
        } catch { this.playNext(); }
    }

    flush() {
        this._interrupted = true;
        this.chunks = [];
        try { this.currentSource?.stop(); } catch {}
        this.currentSource = null;
        this.isPlaying = false;
    }

    finalize() {}
}

export default function ConsolePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDemoRunning, setIsDemoRunning] = useState(false);
    const [agentState, setAgentState] = useState<AgentState>("idle");
    const [transcript, setTranscript] = useState<string[]>([]);
    const [agentReply, setAgentReply] = useState<string | null>(null);
    const [activeWidget, setActiveWidget] = useState<"price" | "rag" | null>(null);
    const [widgetData, setWidgetData] = useState<any>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus>("disconnected");
    const [statusMessage, setStatusMessage] = useState("Ready");
    const [latencySTT, setLatencySTT] = useState<number | null>(null);
    const [latencyAudio, setLatencyAudio] = useState<number | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [sessionSummary, setSessionSummary] = useState<{ duration: number; turns: number; preview: string } | null>(null);
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

    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [transcript]);
    useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

    useEffect(() => {
        apiFetch("/agents/").then(r => r.json()).then(d => {
            const agentsArray = Array.isArray(d) ? d : [];
            setAgents(agentsArray);
            if (agentsArray.length > 0) setSelectedAgentId(agentsArray[0].id);
        }).catch(console.error);
    }, []);

    const handleServerMessage = useCallback(async (msg: any) => {
        if (msg.type === "audio_chunk") {
            if (playerRef.current) await playerRef.current.enqueue(msg.data);
            if (msg.is_first) {
                if (tFirstAgentRef.current) setLatencyAudio(Date.now() - tFirstAgentRef.current);
                setTranscript(p => [...p, "System: 🔊 Agent speaking..."]);
            }
            return;
        }
        if (msg.type === "audio_end") { playerRef.current?.finalize(); return; }
        if (msg.type === "interrupt") {
            playerRef.current?.flush();
            setTranscript(p => [...p, "System: ⚡ Interrupted"]);
            return;
        }
        if (msg.type === "actions") {
            for (const action of (msg.actions || []) as Array<{ type: string; payload: any }>) {
                if (action.type === "show_price" && action.payload) {
                    setActiveWidget("price"); setWidgetData(action.payload);
                } else if (action.type === "show_listings" && action.payload?.listings) {
                    setActiveWidget("rag"); setWidgetData(action.payload.listings);
                }
            }
            return;
        }
        if (msg.type === "status") {
            const map: Record<string, AgentState> = { listening: "listening", processing: "processing", speaking: "speaking" };
            setAgentState(map[msg.status] ?? "idle");
            setModelStatus(msg.status as ModelStatus);
            setStatusMessage(msg.message);
            return;
        }
        if (msg.type === "transcript") {
            const tok = msg.speaker === "agent" ? "🤖 Agent:" : "🎙️ You:";
            if (msg.speaker === "user" && msg.is_final) tUserStopRef.current = Date.now();
            if (msg.speaker === "agent" && msg.is_final && tUserStopRef.current) {
                const now = Date.now();
                setLatencySTT(now - tUserStopRef.current);
                tFirstAgentRef.current = now;
            }
            if (msg.is_final) {
                setTranscript(p => [...p, `${tok} ${msg.text}`]);
                if (msg.speaker === "agent") setAgentReply(msg.text);
            } else {
                setTranscript(p => {
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
            setModelStatus("error");
            setStatusMessage(`Error: ${msg.message}`);
            setTranscript(p => [...p, `System: ❌ ${msg.message}`]);
        }
    }, []);

    const RETRY_DELAYS = [1500, 3000, 6000];

    const handleRetry = useCallback(() => {
        const n = retryRef.current;
        if (n >= 3) { setStatusMessage("Max retries reached."); return; }
        retryRef.current = n + 1;
        setRetryCount(n + 1);
        setStatusMessage(`Reconnecting in ${RETRY_DELAYS[n] / 1000}s… (${n + 1}/3)`);
        setTimeout(() => startRecording(), RETRY_DELAYS[n]);
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
            setTranscript(p => [...p, "System: 🎤 Microphone access granted"]);

            const ws = new WebSocket(`${WS_BASE}/ws/voice_agent`);
            socketRef.current = ws;

            ws.onopen = () => {
                setIsConnecting(false);
                retryRef.current = 0;
                setRetryCount(0);
                setModelStatus("connected");
                setStatusMessage("Connected — initializing STT...");
                setTranscript(p => [...p, "System: 🔌 Connected to ORICALO backend"]);

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
                        const s = Math.max(-1, Math.min(1, input[i]));
                        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    const bytes = new Uint8Array(pcm.buffer);
                    const b64 = btoa(bytes.reduce((d, b) => d + String.fromCharCode(b), ""));
                    ws.send(JSON.stringify({ type: "audio", data: b64, format: "pcm_s16le", sampleRate: 16000 }));
                };
                source.connect(processor);
                processor.connect(audioContext.destination);
                (streamRef.current as any)._audioContext = audioContext;
                (streamRef.current as any)._processor = processor;
            };

            ws.onmessage = async (e) => handleServerMessage(JSON.parse(e.data));

            ws.onerror = () => {
                setIsConnecting(false);
                setAgentState("error");
                setModelStatus("error");
                setStatusMessage("Connection error");
            };

            ws.onclose = () => {
                setIsConnecting(false);
                setModelStatus("disconnected");
                if (isRecordingRef.current) {
                    handleRetry();
                } else {
                    setAgentState("idle");
                    setStatusMessage("Session ended");
                    setTranscript(p => [...p, "System: 🔌 Connection closed"]);
                }
            };
        } catch (err) {
            setIsConnecting(false);
            setAgentState("error");
            setModelStatus("error");
            setStatusMessage("Microphone access denied");
            setTranscript(p => [...p, "System: ❌ Microphone access denied"]);
        }
    };

    const stopRecording = () => {
        const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
        isRecordingRef.current = false;
        setIsRecording(false);
        setAgentState("idle");
        setTranscript(p => [...p, "System: ⏹️ Session ended"]);

        if (playerRef.current) { playerRef.current.flush(); playerRef.current = null; }
        if (streamRef.current) {
            const ctx = (streamRef.current as any)._audioContext;
            const proc = (streamRef.current as any)._processor;
            if (proc) proc.disconnect();
            if (ctx && ctx.state !== "closed") ctx.close();
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }

        setModelStatus("disconnected");
        setStatusMessage("Session ended");
        setSessionSummary({
            duration,
            turns: transcript.filter(l => l.startsWith("🎙️") || l.startsWith("🤖")).length,
            preview: agentReply ?? "No response generated",
        });
    };

    const runDemo = () => {
        if (isDemoRunning) { demoCleanupRef.current?.(); return; }
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
            setSessionSummary({ duration: dur, turns: 4, preview: agentReply ?? "Demo complete" });
        }, 30000);
    };

    const active = isRecording || isDemoRunning;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            {/* ── Header ── */}
            <header className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-slate-400" />
                        Live Console
                    </h1>
                    <div className="flex gap-4 text-xs font-mono text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                            {active ? "SESSION ACTIVE" : "IDLE"}
                        </span>
                        {(latencySTT || latencyAudio) && (
                            <span className="flex items-center gap-1 text-indigo-400/80">
                                <Zap className="w-3 h-3" />
                                {latencySTT && `STT→Reply: ${latencySTT}ms`}
                                {latencySTT && latencyAudio && " · "}
                                {latencyAudio && `Reply→Audio: ${latencyAudio}ms`}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <StatusIndicator modelStatus={modelStatus} statusMessage={statusMessage} />
                    <select
                        className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none hover:bg-slate-800 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        value={selectedAgentId ?? ""}
                        onChange={e => setSelectedAgentId(Number(e.target.value))}
                        disabled={active}
                    >
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        {agents.length === 0 && <option value="">No agents — run seed script</option>}
                    </select>

                    <button
                        onClick={runDemo}
                        disabled={isRecording}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border
                            ${isDemoRunning
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/40 hover:bg-indigo-500/20"
                            } disabled:opacity-40`}
                    >
                        <Play className="w-4 h-4" />
                        {isDemoRunning ? "Stop Demo" : "Run Demo"}
                    </button>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isDemoRunning || isConnecting}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-40
                            ${isRecording
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50"
                                : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border border-transparent shadow-lg shadow-indigo-500/20"
                            }`}
                    >
                        {isConnecting
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
                            : isRecording
                                ? <><Square className="w-4 h-4" /> Stop</>
                                : <><Mic className="w-4 h-4" /> Start Session</>
                        }
                    </button>
                </div>
            </header>

            {/* ── Main Grid ── */}
            <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Transcript terminal */}
                <div className="col-span-12 lg:col-span-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                    <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
                        <span className="text-xs font-mono text-slate-400">/var/log/transcript.log</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">STREAMING</span>
                            <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">BARGE-IN</span>
                        </div>
                    </div>
                    <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
                        {transcript.length === 0 && (
                            <div className="text-slate-600 italic">Waiting for input stream…</div>
                        )}
                        {transcript.map((line, i) => (
                            <div key={i} className="break-words flex gap-3">
                                <span className="text-slate-600 shrink-0 select-none text-xs mt-0.5">
                                    {new Date().toLocaleTimeString()}
                                </span>
                                <span className={`font-urdu ${
                                    line.startsWith("System:") ? "text-yellow-400" :
                                    line.startsWith("🎙️") ? "text-blue-400" :
                                    line.startsWith("🤖") ? "text-emerald-400" :
                                    "text-slate-300"
                                }`}>
                                    {line}
                                </span>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>

                {/* Right panel */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
                    {/* State visualizer */}
                    <div className={`bg-slate-900/50 backdrop-blur-xl border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all duration-300 ${
                        agentState === "error" ? "border-red-500/40 bg-red-950/10" :
                        agentState === "speaking" ? "border-indigo-500/40" :
                        agentState === "listening" ? "border-emerald-500/40" :
                        agentState === "processing" ? "border-emerald-500/30" :
                        "border-slate-800"
                    }`}>
                        {/* IDLE */}
                        {agentState === "idle" && !sessionSummary && (
                            <>
                                <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
                                    <Mic className="w-7 h-7 text-slate-500" />
                                </div>
                                <p className="text-slate-500 text-sm text-center">
                                    Click &quot;Start Session&quot; or &quot;Run Demo&quot;
                                </p>
                            </>
                        )}

                        {/* LISTENING */}
                        {agentState === "listening" && (
                            <>
                                <div className="w-16 h-16 rounded-full border-2 border-emerald-500/60 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
                                    <Mic className="w-7 h-7 text-emerald-400" />
                                </div>
                                <WaveformVisualizer analyser={analyser} isRecording={active} />
                                <p className="text-emerald-400 text-sm font-medium tracking-wide">Listening…</p>
                            </>
                        )}

                        {/* PROCESSING */}
                        {agentState === "processing" && (
                            <>
                                <div className="flex gap-1.5 items-end h-10">
                                    {[16, 24, 20].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-2.5 bg-emerald-400 rounded-full animate-bounce"
                                            style={{ height: h, animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </div>
                                <p className="text-emerald-400 text-sm font-medium">Thinking…</p>
                            </>
                        )}

                        {/* SPEAKING */}
                        {agentState === "speaking" && (
                            <>
                                <div className="flex gap-1 items-center h-10">
                                    {[12, 20, 28, 20, 12].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-2 bg-indigo-400 rounded-full"
                                            style={{
                                                height: h,
                                                animation: `bounce ${0.5 + i * 0.08}s ease-in-out infinite alternate`,
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-indigo-400 text-sm font-medium">Speaking…</p>
                                {(latencySTT || latencyAudio) && (
                                    <div className="text-[11px] text-slate-500 text-center space-y-0.5">
                                        {latencySTT && <div>STT→Reply: <span className="text-indigo-400">{latencySTT}ms</span></div>}
                                        {latencyAudio && <div>Reply→Audio: <span className="text-indigo-400">{latencyAudio}ms</span></div>}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ERROR */}
                        {agentState === "error" && (
                            <>
                                <AlertCircle className="w-10 h-10 text-red-400" />
                                <p className="text-red-400 text-sm text-center px-2">{statusMessage}</p>
                                <button
                                    onClick={handleRetry}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-sm hover:bg-red-500/20 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Retry ({retryCount}/3)
                                </button>
                            </>
                        )}

                        {/* SESSION SUMMARY */}
                        {agentState === "idle" && sessionSummary && (
                            <div className="w-full text-center space-y-3">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                                <p className="text-white font-medium text-sm">Session Complete</p>
                                <div className="text-xs text-slate-400 space-y-1">
                                    <div>Duration: <span className="text-white">{Math.floor(sessionSummary.duration / 60)}m {sessionSummary.duration % 60}s</span></div>
                                    <div>Turns: <span className="text-white">{sessionSummary.turns}</span></div>
                                </div>
                                <p className="text-xs text-slate-500 italic line-clamp-2 px-2">{sessionSummary.preview}</p>
                                <div className="flex gap-2 justify-center">
                                    <a
                                        href="/crm"
                                        className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 transition-colors"
                                    >
                                        View CRM
                                    </a>
                                    <button
                                        onClick={() => setSessionSummary(null)}
                                        className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700 transition-colors"
                                    >
                                        New Session
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Latest response */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col">
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Latest Response</h2>
                        <div className="text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-urdu text-sm">
                            {agentReply ?? <span className="text-slate-600 italic">No output yet.</span>}
                        </div>
                    </div>

                    {/* Widget area */}
                    {activeWidget && widgetData && (
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 transition-all duration-500 ease-out">
                            {activeWidget === "price" && (
                                <PriceWidget
                                    minPrice={widgetData.min_price}
                                    maxPrice={widgetData.max_price}
                                    confidence={widgetData.confidence}
                                />
                            )}
                            {activeWidget === "rag" && (
                                <RagWidget listings={Array.isArray(widgetData) ? widgetData : widgetData.listings} />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
