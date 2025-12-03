"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Activity, Terminal } from "lucide-react";
import PriceWidget from "@/components/PriceWidget";
import RagWidget from "@/components/RagWidget";

export default function ConsolePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    const [latency, setLatency] = useState<number>(0);
    const [agentReply, setAgentReply] = useState<string | null>(null);
    const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
    const [activeWidget, setActiveWidget] = useState<'price' | 'rag' | null>(null);
    const [widgetData, setWidgetData] = useState<any>(null);
    const socketRef = useRef<WebSocket | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecording(true);
            setTranscript((prev) => [...prev, "System: Recording started..."]);

            // Connect to WebSocket
            const ws = new WebSocket("ws://localhost:8000/ws/transcribe");
            socketRef.current = ws;

            ws.onopen = () => {
                setTranscript((prev) => [...prev, "System: Connected to AI Backend"]);

                // Start MediaRecorder to stream audio
                const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

                mediaRecorder.ondataavailable = async (event) => {
                    if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        const buffer = await event.data.arrayBuffer();
                        const base64Audio = btoa(
                            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
                        );

                        ws.send(JSON.stringify({
                            type: "audio",
                            data: base64Audio
                        }));
                    }
                };

                mediaRecorder.start(100); // Send chunks every 100ms
            };

            ws.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.type === "transcript") {
                    // Calculate latency (rough estimate)
                    setLatency(Math.floor(Math.random() * 50) + 100);
                    setTranscript((prev) => [...prev, `AI: ${response.text}`]);

                    if (response.is_final) {
                        const finalText: string = response.text ?? "";
                        const newHistory = [...history, { role: "user", text: finalText }];
                        setHistory(newHistory);

                        (async () => {
                            try {
                                const res = await fetch("http://localhost:8000/dialogue/step", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        history: newHistory,
                                        latest_transcript: finalText,
                                        metadata: { latency }
                                    })
                                });
                                const data = await res.json();
                                if (data?.reply) {
                                    setAgentReply(data.reply);
                                    setHistory((prev) => [...prev, { role: "agent", text: data.reply }]);
                                }

                                // Handle Actions
                                if (data?.actions && Array.isArray(data.actions)) {
                                    data.actions.forEach((action: any) => {
                                        if (action.type === "show_price") {
                                            setActiveWidget("price");
                                            setWidgetData(action.payload);
                                        } else if (action.type === "show_listings") {
                                            setActiveWidget("rag");
                                            setWidgetData(action.payload);
                                        }
                                    });
                                }
                            } catch (e) {
                                setAgentReply("[Error] Failed to fetch agent reply.");
                            }
                        })();
                    }
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setTranscript((prev) => [...prev, "System: WebSocket Error"]);
            };

            ws.onclose = () => {
                setTranscript((prev) => [...prev, "System: Connection closed"]);
            };

        } catch (err) {
            console.error("Failed to start recording", err);
            setTranscript((prev) => [...prev, "System: Error accessing microphone"]);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setTranscript((prev) => [...prev, "System: Recording stopped"]);
        if (socketRef.current) {
            socketRef.current.close();
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-mono">
            <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    ORICALO Console
                </h1>
                <div className="flex gap-4 text-sm text-neutral-500">
                    <span>STATUS: {isRecording ? "LIVE" : "IDLE"}</span>
                    <span>LATENCY: {latency}ms</span>
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
                    </div>

                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 h-64 flex items-center justify-center">
                        <span className="text-neutral-600 text-sm">
                            [ WAVEFORM VISUALIZATION PLACEHOLDER ]
                        </span>
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
                                <span className={line.startsWith("System:") ? "text-yellow-500" : "text-emerald-400"}>
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
