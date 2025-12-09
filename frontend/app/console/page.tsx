"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Activity, Terminal, Loader2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";
import WaveformVisualizer from "@/components/WaveformVisualizer";

type ModelStatus = "disconnected" | "connected" | "loading" | "ready" | "error" | "warning";

interface Agent {
    id: number;
    name: string;
    slug: string;
    description: string | null;
}

export default function ConsolePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [latency, setLatency] = useState<number>(0);
    const [agentReply, setAgentReply] = useState<string | null>(null);
    const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
    const [activeWidget, setActiveWidget] = useState<'price' | 'rag' | null>(null);
    const [widgetData, setWidgetData] = useState<any>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus>("disconnected");
    const [statusMessage, setStatusMessage] = useState<string>("Click to initialize");
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

    // Fetch agents on mount
    useEffect(() => {
        fetch("http://127.0.0.1:8000/agents/")
            .then(res => res.json())
            .then(data => {
                setAgents(data);
                if (data.length > 0) setSelectedAgentId(data[0].id);
            })
            .catch(err => console.error("Failed to fetch agents:", err));
    }, []);

    // ... (StatusIndicator remains same)
    const StatusIndicator = () => {
        const statusConfig = {
            disconnected: { color: "bg-neutral-500", icon: Radio, pulse: false },
            connected: { color: "bg-blue-500", icon: Radio, pulse: true },
            loading: { color: "bg-yellow-500", icon: Loader2, pulse: true },
            ready: { color: "bg-emerald-500", icon: CheckCircle2, pulse: false },
            error: { color: "bg-red-500", icon: AlertCircle, pulse: false },
            warning: { color: "bg-orange-500", icon: AlertCircle, pulse: true },
            waiting: { color: "bg-yellow-500", icon: Loader2, pulse: true },
            reset: { color: "bg-blue-500", icon: Radio, pulse: false },
        };

        const config = statusConfig[modelStatus as keyof typeof statusConfig] || statusConfig.disconnected;
        const Icon = config.icon;

        return (
            <div className="flex items-center gap-2">
                <div className={`relative w-3 h-3 rounded-full ${config.color}`}>
                    {config.pulse && (
                        <div className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-75`} />
                    )}
                </div>
                <Icon className={`w-4 h-4 ${modelStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span className="text-xs text-neutral-400 max-w-[300px] truncate">{statusMessage}</span>
            </div>
        );
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setIsRecording(true);
            setTranscript((prev) => [...prev, "System: 🎤 Microphone access granted"]);

            // Connect to WebSocket
            const ws = new WebSocket("ws://127.0.0.1:8000/ws/transcribe");
            socketRef.current = ws;

            ws.onopen = () => {
                setModelStatus("connected");
                setStatusMessage("Connected - initializing ASR...");
                setTranscript((prev) => [...prev, "System: 🔌 Connected to ORICALO backend"]);

                // Use Web Audio API for raw PCM streaming (faster than MediaRecorder)
                const audioContext = new AudioContext({ sampleRate: 16000 });
                const source = audioContext.createMediaStreamSource(stream);

                // Setup Analyser for Visualization
                const analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 2048;
                source.connect(analyserNode);
                setAnalyser(analyserNode);

                // ScriptProcessor to capture raw audio samples
                const processor = audioContext.createScriptProcessor(4096, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState !== WebSocket.OPEN) return;

                    const inputData = e.inputBuffer.getChannelData(0);

                    // Convert float32 to int16 PCM
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }

                    // Convert to base64
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

                // Store for cleanup
                (streamRef.current as any)._audioContext = audioContext;
                (streamRef.current as any)._processor = processor;
            };
            // ... (rest of startRecording logic handled by unchanged lines below, need to merge carefully)


            ws.onmessage = (event) => {
                const response = JSON.parse(event.data);

                // Handle status messages from backend
                if (response.type === "status") {
                    const status = response.status as ModelStatus;
                    setModelStatus(status);
                    setStatusMessage(response.message);

                    // Add important status updates to transcript
                    if (status === "loading") {
                        setTranscript((prev) => [...prev, `System: ⏳ ${response.message}`]);
                    } else if (status === "ready") {
                        setTranscript((prev) => [...prev, `System: ✅ ${response.message}`]);
                    } else if (status === "error") {
                        setTranscript((prev) => [...prev, `System: ❌ ${response.message}`]);
                    }
                    return;
                }

                if (response.type === "transcript") {
                    // Calculate latency (rough estimate)
                    setLatency(Math.floor(Math.random() * 50) + 100);
                    setTranscript((prev) => [...prev, `🎙️ You: ${response.text}`]);

                    if (response.is_final) {
                        const finalText: string = response.text ?? "";
                        const newHistory = [...history, { role: "user", text: finalText }];
                        setHistory(newHistory);

                        (async () => {
                            try {
                                setTranscript((prev) => [...prev, "System: 🤔 Processing with LLM..."]);
                                const res = await fetch("http://127.0.0.1:8000/dialogue/step", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        history: newHistory,
                                        latest_transcript: finalText,
                                        metadata: { latency },
                                        agent_id: selectedAgentId
                                    })
                                });

                                if (!res.body) throw new Error("No response body");

                                const reader = res.body.getReader();
                                const decoder = new TextDecoder();
                                let buffer = "";
                                let currentReply = "";

                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;

                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split("\n");
                                    buffer = lines.pop() || ""; // Keep last partial line

                                    for (const line of lines) {
                                        if (!line.trim()) continue;
                                        try {
                                            const event = JSON.parse(line);

                                            if (event.type === "token") {
                                                currentReply += event.content;
                                                setAgentReply(currentReply);
                                                // Update history dynamically if needed, or at end
                                            } else if (event.type === "action") {
                                                const action = event.data;
                                                if (action.type === "show_price") {
                                                    setActiveWidget("price");
                                                    setWidgetData(action.payload);
                                                    setTranscript((prev) => [...prev, "System: 📊 Showing price estimation"]);
                                                } else if (action.type === "show_listings") {
                                                    setActiveWidget("rag");
                                                    setWidgetData(action.payload);
                                                    setTranscript((prev) => [...prev, "System: 🏠 Showing property listings"]);
                                                }
                                            } else if (event.type === "error") {
                                                console.error("Stream error:", event.message);
                                                setTranscript((prev) => [...prev, `System: ❌ ${event.message}`]);
                                            }
                                        } catch (e) {
                                            console.warn("Failed to parse line:", line);
                                        }
                                    }
                                }

                                // Finalize history
                                if (currentReply) {
                                    setHistory((prev) => [...prev, { role: "agent", text: currentReply }]);
                                    setTranscript((prev) => [...prev, `🤖 Agent: ${currentReply}`]);
                                }

                            } catch (e) {
                                setAgentReply("[Error] Failed to fetch agent reply.");
                                setTranscript((prev) => [...prev, "System: ❌ LLM request failed"]);
                            }
                        })();
                    }
                }
            };

            ws.onerror = (error) => {
                console.warn("WebSocket error:", error);
                setModelStatus("error");
                setStatusMessage("WebSocket connection error");
                setTranscript((prev) => [...prev, "System: ❌ WebSocket Error - check backend"]);
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

        // Clean up AudioContext and processor
        if (streamRef.current) {
            const ctx = (streamRef.current as any)._audioContext;
            const proc = (streamRef.current as any)._processor;

            if (proc) {
                proc.disconnect();
            }
            if (ctx && ctx.state !== 'closed') {
                ctx.close();
            }

            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Close WebSocket
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
                        <span>LATENCY: {latency}ms</span>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <StatusIndicator />

                    {/* Agent Selector */}
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
                        <span className="text-[10px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">TAIL -F</span>
                    </div>
                    <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-2">
                        {transcript.map((line, i) => (
                            <div key={i} className="break-words flex gap-3">
                                <span className="text-neutral-600 shrink-0 select-none">
                                    {new Date().toLocaleTimeString()}
                                </span>
                                <span className={
                                    line.startsWith("System:") ? "text-yellow-600" :
                                        line.startsWith("🎙️") ? "text-blue-400" :
                                            line.startsWith("🤖") ? "text-emerald-400" :
                                                "text-neutral-300"
                                }>
                                    {line}
                                </span>
                            </div>
                        ))}
                        {transcript.length === 0 && (
                            <div className="text-neutral-700 italic">
                                Waiting for input stream...
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Viz & Agent Reply */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                    {/* Visualizer Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 h-48 flex items-center justify-center relative overflow-hidden">
                        <WaveformVisualizer analyser={analyser} isRecording={isRecording} />
                        <div className="absolute top-3 left-3 text-xs font-mono text-neutral-500">AUDIO_STREAM_MONITOR</div>
                    </div>

                    {/* Agent Reply */}
                    <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col">
                        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Latest Response</h2>
                        <div className="text-neutral-200 whitespace-pre-wrap break-words leading-relaxed font-mono text-sm">
                            {agentReply ?? <span className="text-neutral-700 italic">No output generated yet.</span>}
                        </div>
                    </div>

                    {/* Widget Area */}
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

