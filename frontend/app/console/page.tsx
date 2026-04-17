"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Terminal } from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { StatusIndicator, type ModelStatus } from "@/components/StatusIndicator";
import { apiFetch, WS_BASE } from "@/lib/api";
import type { Agent } from "@/lib/types";

/**
 * Streaming Audio Player
 * 
 * Manages a queue of MP3 audio chunks received from the backend.
 * Plays them sequentially without gaps, and supports instant
 * interruption (flush) for barge-in.
 */
class StreamingAudioPlayer {
    private audioContext: AudioContext;
    private chunks: ArrayBuffer[] = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;
    private onPlaybackEnd: (() => void) | null = null;
    private _interrupted = false;

    constructor(audioContext: AudioContext, onPlaybackEnd?: () => void) {
        this.audioContext = audioContext;
        this.onPlaybackEnd = onPlaybackEnd || null;
    }

    /** Add a decoded chunk to the playback queue */
    async enqueue(base64Data: string) {
        try {
            const binaryStr = window.atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            this.chunks.push(bytes.buffer);

            if (!this.isPlaying) {
                this._interrupted = false;
                this.playNext();
            }
        } catch (e) {
            console.error("Failed to enqueue audio chunk", e);
        }
    }

    /** Play the next chunk in the queue */
    private async playNext() {
        if (this._interrupted || this.chunks.length === 0) {
            this.isPlaying = false;
            if (!this._interrupted && this.onPlaybackEnd) {
                this.onPlaybackEnd();
            }
            return;
        }

        this.isPlaying = true;
        const chunk = this.chunks.shift()!;

        try {
            const audioBuffer = await this.audioContext.decodeAudioData(chunk.slice(0));
            if (this._interrupted) {
                this.isPlaying = false;
                return;
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            this.currentSource = source;

            source.onended = () => {
                this.currentSource = null;
                this.playNext();
            };

            source.start(0);
        } catch (e) {
            console.warn("Audio decode/play error, skipping chunk:", e);
            this.playNext();
        }
    }

    /** Immediately stop playback and flush all queued audio (barge-in) */
    flush() {
        this._interrupted = true;
        this.chunks = [];

        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch {
                // Already stopped
            }
            this.currentSource = null;
        }

        this.isPlaying = false;
    }

    /** Signal that no more chunks are coming — play remaining queue */
    finalize() {
        // Nothing special needed; playNext() will drain naturally
    }
}

export default function ConsolePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [agentReply, setAgentReply] = useState<string | null>(null);
    const [activeWidget, setActiveWidget] = useState<'price' | 'rag' | null>(null);
    const [widgetData, setWidgetData] = useState<any>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus>("disconnected");
    const [statusMessage, setStatusMessage] = useState<string>("Click to initialize");
    const socketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
    const playerRef = useRef<StreamingAudioPlayer | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll transcript to bottom
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    useEffect(() => {
        apiFetch("/agents/")
            .then(res => res.json())
            .then(data => {
                setAgents(data);
                if (data.length > 0) setSelectedAgentId(data[0].id);
            })
            .catch(err => console.error("Failed to fetch agents:", err));
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setIsRecording(true);
            setTranscript((prev) => [...prev, "System: 🎤 Microphone access granted"]);

            const ws = new WebSocket(`${WS_BASE}/ws/voice_agent`);
            socketRef.current = ws;

            ws.onopen = () => {
                setModelStatus("connected");
                setStatusMessage("Connected — initializing STT...");
                setTranscript((prev) => [...prev, "System: 🔌 Connected to ORICALO backend"]);

                // Raw PCM streaming via Web Audio API
                const audioContext = new AudioContext({ sampleRate: 16000 });
                const source = audioContext.createMediaStreamSource(stream);

                const analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 2048;
                source.connect(analyserNode);
                setAnalyser(analyserNode);

                // Initialize streaming audio player for agent responses
                playerRef.current = new StreamingAudioPlayer(audioContext, () => {
                    // Playback ended naturally
                });

                const processor = audioContext.createScriptProcessor(4096, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState !== WebSocket.OPEN) return;

                    const inputData = e.inputBuffer.getChannelData(0);

                    // Float32 → Int16 PCM conversion
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }

                    const bytes = new Uint8Array(pcmData.buffer);
                    const base64Audio = btoa(
                        bytes.reduce((data, byte) => data + String.fromCharCode(byte), "")
                    );

                    ws.send(JSON.stringify({
                        type: "audio",
                        data: base64Audio,
                        format: "pcm_s16le",
                        sampleRate: 16000
                    }));
                };

                source.connect(processor);
                processor.connect(audioContext.destination);

                // Stash refs for cleanup
                (streamRef.current as any)._audioContext = audioContext;
                (streamRef.current as any)._processor = processor;
            };

            ws.onmessage = async (event) => {
                const response = JSON.parse(event.data);

                // --- Streaming Audio Chunks (new) ---
                if (response.type === "audio_chunk") {
                    if (playerRef.current) {
                        await playerRef.current.enqueue(response.data);
                    }
                    if (response.is_first) {
                        setTranscript((prev) => [...prev, "System: 🔊 Agent speaking..."]);
                    }
                    return;
                }

                // --- Audio Stream End (new) ---
                if (response.type === "audio_end") {
                    if (playerRef.current) {
                        playerRef.current.finalize();
                    }
                    return;
                }

                // --- Barge-In Interrupt (new) ---
                if (response.type === "interrupt") {
                    if (playerRef.current) {
                        playerRef.current.flush();
                    }
                    setTranscript((prev) => [...prev, "System: ⚡ User interrupted — agent stopped"]);
                    return;
                }

                // --- Legacy: full audio blob (backward compat) ---
                if (response.type === "audio_out") {
                    try {
                        const binaryStr = window.atob(response.data);
                        const len = binaryStr.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }

                        const audioCtx = (streamRef.current as any)?._audioContext;
                        if (audioCtx) {
                            const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
                            const source = audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioCtx.destination);
                            source.start(0);
                        }
                    } catch (e) {
                        console.error("Audio playback failed", e);
                    }
                    return;
                }

                if (response.type === "status") {
                    const status = response.status as ModelStatus;
                    setModelStatus(status);
                    setStatusMessage(response.message);
                    return;
                }

                if (response.type === "transcript") {
                    const speakerToken = response.speaker === "agent" ? "🤖 Agent:" : "🎙️ You:";

                    if (response.is_final) {
                        setTranscript((prev) => [...prev, `${speakerToken} ${response.text}`]);
                    } else {
                        // Update partial transcript (replace last partial if exists)
                        setTranscript((prev) => {
                            const lastLine = prev[prev.length - 1];
                            if (lastLine && lastLine.startsWith("🎙️ You:") && !lastLine.includes("✓")) {
                                // Replace the last partial with updated partial
                                return [...prev.slice(0, -1), `${speakerToken} ${response.text}`];
                            }
                            return [...prev, `${speakerToken} ${response.text}`];
                        });
                    }

                    if (response.speaker === "agent" && response.is_final) {
                        setAgentReply(response.text);
                    }
                    return;
                }

                if (response.type === "error") {
                    console.error("Backend Error:", response.message);
                    setModelStatus("error");
                    setStatusMessage(`Error: ${response.message}`);
                    setTranscript((prev) => [...prev, `System: ❌ Error - ${response.message}`]);
                    return;
                }
            };

            ws.onerror = (error) => {
                console.warn("WebSocket error:", error);
                setModelStatus("error");
                setStatusMessage("WebSocket connection error");
            };

            ws.onclose = () => {
                setModelStatus("disconnected");
                setStatusMessage("Connection closed");
                setTranscript((prev) => [...prev, "System: 🔌 Connection closed"]);
            };

        } catch (err) {
            console.error("Failed to start recording", err);
            setModelStatus("error");
            setStatusMessage("Microphone access denied");
            setTranscript((prev) => [...prev, "System: ❌ Error accessing microphone"]);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setTranscript((prev) => [...prev, "System: ⏹️ Recording stopped"]);

        // Flush any playing audio
        if (playerRef.current) {
            playerRef.current.flush();
            playerRef.current = null;
        }

        if (streamRef.current) {
            const ctx = (streamRef.current as any)._audioContext;
            const proc = (streamRef.current as any)._processor;

            if (proc) proc.disconnect();
            if (ctx && ctx.state !== 'closed') ctx.close();

            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        setModelStatus("disconnected");
        setStatusMessage("Session ended");
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-neutral-400" />
                        Live Console
                    </h1>
                    <div className="flex gap-4 text-xs font-mono text-neutral-500 mt-2">
                        <span className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"}`} />
                            {isRecording ? "SESSION ACTIVE" : "IDLE"}
                        </span>
                        <span className="flex items-center gap-1 text-neutral-600">
                        </span>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <StatusIndicator modelStatus={modelStatus} statusMessage={statusMessage} />

                    <select
                        className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded-md px-3 py-1.5 focus:border-neutral-600 outline-none hover:bg-neutral-800 transition-colors"
                        value={selectedAgentId ?? ""}
                        onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                        disabled={isRecording}
                    >
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isRecording
                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50"
                            : "bg-white text-black hover:bg-neutral-200 border border-transparent"
                            }`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-4 h-4" /> Stop
                            </>
                        ) : (
                            <>
                                <Mic className="w-4 h-4" /> Start Session
                            </>
                        )}
                    </button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Transcript Terminal */}
                <div className="col-span-12 lg:col-span-8 bg-black border border-neutral-800 rounded-lg flex flex-col overflow-hidden shadow-sm">
                    <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-neutral-400">/var/log/transcript.log</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">STREAMING</span>
                            <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">BARGE-IN</span>
                        </div>
                    </div>
                    <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
                        {transcript.map((line, i) => (
                            <div key={i} className="break-words flex gap-3">
                                <span className="text-neutral-600 shrink-0 select-none">
                                    {new Date().toLocaleTimeString()}
                                </span>
                                <span className={`font-urdu ${line.startsWith("System:") ? "text-yellow-600" :
                                    line.startsWith("🎙️") ? "text-blue-400" :
                                        line.startsWith("🤖") ? "text-emerald-400" :
                                            "text-neutral-300"
                                    }`}>
                                    {line}
                                </span>
                            </div>
                        ))}
                        {transcript.length === 0 && (
                            <div className="text-neutral-700 italic">
                                Waiting for input stream...
                            </div>
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>

                {/* Right Panel: Viz & Agent Reply */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 h-48 flex items-center justify-center relative overflow-hidden">
                        <WaveformVisualizer analyser={analyser} isRecording={isRecording} />
                        <div className="absolute top-3 left-3 text-xs font-mono text-neutral-500">AUDIO_STREAM_MONITOR</div>
                    </div>

                    <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col">
                        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Latest Response</h2>
                        <div className="text-neutral-200 whitespace-pre-wrap break-words leading-relaxed font-urdu">
                            {agentReply ?? <span className="text-neutral-700 italic">No output generated yet.</span>}
                        </div>
                    </div>

                    {activeWidget && widgetData && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            {activeWidget === 'price' && (
                                <PriceWidget
                                    minPrice={widgetData.min_price}
                                    maxPrice={widgetData.max_price}
                                    confidence={widgetData.confidence}
                                />
                            )}
                            {activeWidget === 'rag' && (
                                <RagWidget listings={widgetData.listings} />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
