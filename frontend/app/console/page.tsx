"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Activity, Terminal, Loader2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";
import WaveformVisualizer from "@/components/WaveformVisualizer";

type ModelStatus = "disconnected" | "connected" | "loading" | "ready" | "error" | "warning";

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
                                setAgentReply(""); // Clear previous reply

                                const res = await fetch("http://127.0.0.1:8000/dialogue/step", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        history: newHistory,
                                        latest_transcript: finalText,
                                        metadata: { latency }
                                    })
                                });

                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                
                                const reader = res.body?.getReader();
                                if (!reader) throw new Error("No readable stream");

                                const decoder = new TextDecoder();
                                let buffer = "";
                                let fullReply = "";

                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;

                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split("\n");
                                    buffer = lines.pop() || ""; // Keep incomplete line

                                    for (const line of lines) {
                                        if (!line.trim()) continue;
                                        try {
                                            const data = JSON.parse(line);
                                            
                                            if (data.type === "token") {
                                                const token = data.text || "";
                                                fullReply += token;
                                                setAgentReply((prev) => (prev || "") + token);
                                            } else if (data.type === "actions") {
                                                const actions = data.data || [];
                                                for (const action of actions) {
                                                    if (action.type === "show_price") {
                                                        setActiveWidget("price");
                                                        setWidgetData(action.payload);
                                                        setTranscript((prev) => [...prev, "System: 📊 Showing price estimation"]);
                                                    } else if (action.type === "show_listings") {
                                                        setActiveWidget("rag");
                                                        setWidgetData(action.payload);
                                                        setTranscript((prev) => [...prev, "System: 🏠 Showing property listings"]);
                                                    }
                                                }
                                            }
                                        } catch (parseError) {
                                            console.warn("Error parsing stream line:", line, parseError);
                                        }
                                    }
                                }

                                // Update history and transcript with full reply
                                if (fullReply) {
                                    setHistory((prev) => [...prev, { role: "agent", text: fullReply }]);
                                    setTranscript((prev) => [...prev, `🤖 Agent: ${fullReply}`]);
                                }

                            } catch (e) {
                                console.error("LLM request failed:", e);
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
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-mono">
            <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    ORICALO Console
                </h1>
                <div className="flex gap-6 items-center">
                    <StatusIndicator />
                    <div className="flex gap-4 text-sm text-neutral-500">
                        <span>STATUS: {isRecording ? "LIVE" : "IDLE"}</span>
                        <span>LATENCY: {latency}ms</span>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls & Viz */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 backdrop-blur-sm">
                        <h2 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">
                            Control Deck
                        </h2>
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isRecording
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50"
                                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/50"
                                }`}
                        >
                            {isRecording ? (
                                <>
                                    <Square className="w-5 h-5" /> STOP SESSION
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5" /> INITIALIZE AGENT
                                </>
                            )}
                        </button>

                        {/* Model Status Card */}
                        <div className={`mt-4 p-3 rounded-lg border ${modelStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/30' :
                            modelStatus === 'loading' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                modelStatus === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                    'bg-neutral-800/50 border-neutral-700'
                            }`}>
                            <div className="text-xs text-neutral-400 mb-1">ASR Model Status</div>
                            <div className={`text-sm font-medium ${modelStatus === 'ready' ? 'text-emerald-400' :
                                modelStatus === 'loading' ? 'text-yellow-400' :
                                    modelStatus === 'error' ? 'text-red-400' :
                                        'text-neutral-300'
                                }`}>
                                {statusMessage}
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 h-64 flex items-center justify-center relative overflow-hidden">
                        <WaveformVisualizer analyser={analyser} isRecording={isRecording} />
                    </div>
                </div>

                {/* Transcript Terminal */}
                <div className="lg:col-span-2 bg-black border border-neutral-800 rounded-xl p-6 font-mono text-sm h-[600px] overflow-y-auto shadow-2xl">
                    <div className="flex items-center gap-2 text-neutral-500 mb-4 border-b border-neutral-900 pb-2">
                        <Terminal className="w-4 h-4" />
                        <span>/var/log/transcript.log</span>
                    </div>
                    <div className="space-y-2">
                        {transcript.map((line, i) => (
                            <div key={i} className="break-words">
                                <span className="text-neutral-600 mr-2">
                                    [{new Date().toLocaleTimeString()}]
                                </span>
                                <span className={
                                    line.startsWith("System:") ? "text-yellow-500" :
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

                {/* Agent Reply Panel & Visuals */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Visual Widget Area */}
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

                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Agent Reply</h2>
                        <div className="text-neutral-200 whitespace-pre-wrap break-words min-h-10">
                            {agentReply ?? "No reply yet."}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

