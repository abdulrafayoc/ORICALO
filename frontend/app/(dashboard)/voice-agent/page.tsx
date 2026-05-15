'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle, RefreshCw, Play } from 'lucide-react';
import { WS_BASE } from '@/lib/api';

type VoiceAgentState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

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

// Custom Radial Audio Visualizer Component
function RadialAudioVisualizer({ 
    analyser, 
    state, 
    color, 
    size = 224, 
    barCount = 32 
}: { 
    analyser: AnalyserNode | null; 
    state: VoiceAgentState; 
    color: string; 
    size?: number; 
    barCount?: number; 
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const radius = size / 2 - 20;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);

            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2;
                const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
                const value = dataArray[dataIndex];
                const barHeight = state === 'speaking' || state === 'listening' 
                    ? (value / 255) * radius * 0.8 
                    : state === 'processing' 
                        ? Math.sin(Date.now() / 200 + i * 0.5) * 10 + 15
                        : 5;

                ctx.save();
                ctx.rotate(angle);
                ctx.fillStyle = color;
                ctx.globalAlpha = state === 'idle' ? 0.3 : 0.8;
                
                // Draw bar
                const barWidth = (Math.PI * 2 * radius) / barCount * 0.6;
                ctx.fillRect(-barWidth / 2, radius, barWidth, barHeight);
                
                ctx.restore();
            }

            ctx.restore();
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, state, color, size, barCount]);

    return (
        <canvas 
            ref={canvasRef} 
            width={size} 
            height={size} 
            style={{ width: size, height: size }}
        />
    );
}

export default function VoiceAgentPage() {
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDemoRunning, setIsDemoRunning] = useState(false);
    const [agentState, setAgentState] = useState<VoiceAgentState>('idle');
    const [statusMessage, setStatusMessage] = useState('Ready to start');
    const [retryCount, setRetryCount] = useState(0);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const playerRef = useRef<StreamingAudioPlayer | null>(null);
    const isRecordingRef = useRef(false);
    const retryRef = useRef(0);

    useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

    const handleServerMessage = useCallback(async (msg: any) => {
        if (msg.type === 'audio_chunk') {
            if (playerRef.current) await playerRef.current.enqueue(msg.data);
            if (msg.is_first) {
                setAgentState('speaking');
            }
            return;
        }
        if (msg.type === 'audio_end') { playerRef.current?.finalize(); setAgentState('listening'); return; }
        if (msg.type === 'interrupt') {
            playerRef.current?.flush();
            setAgentState('listening');
            return;
        }
        if (msg.type === 'status') {
            const map: Record<string, VoiceAgentState> = { listening: 'listening', processing: 'processing', speaking: 'speaking' };
            setAgentState(map[msg.status] ?? 'idle');
            setStatusMessage(msg.message);
            return;
        }
        if (msg.type === 'error') {
            setAgentState('error');
            setStatusMessage(`Error: ${msg.message}`);
        }
    }, []);

    const RETRY_DELAYS = [1500, 3000, 6000];

    const handleRetry = useCallback(() => {
        const n = retryRef.current;
        if (n >= 3) { setStatusMessage('Max retries reached.'); return; }
        retryRef.current = n + 1;
        setRetryCount(n + 1);
        setStatusMessage(`Reconnecting in ${RETRY_DELAYS[n] / 1000}s… (${n + 1}/3)`);
        setTimeout(() => startRecording(), RETRY_DELAYS[n]);
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setIsRecording(true);
            setIsConnecting(true);
            setStatusMessage('Connecting to voice agent...');

            const ws = new WebSocket(`${WS_BASE}/ws/voice_agent`);
            socketRef.current = ws;

            ws.onopen = () => {
                setIsConnecting(false);
                retryRef.current = 0;
                setRetryCount(0);
                setAgentState('listening');
                setStatusMessage('Connected - listening...');

                const audioContext = new AudioContext({ sampleRate: 16000 });
                const source = audioContext.createMediaStreamSource(stream);
                const analyserNode = audioContext.createAnalyser();
                analyserNode.fftSize = 2048;
                source.connect(analyserNode);
                setAnalyser(analyserNode);

                // Create output analyser for AI speech
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
                        const s = Math.max(-1, Math.min(1, input[i]));
                        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    const bytes = new Uint8Array(pcm.buffer);
                    const b64 = btoa(bytes.reduce((d, b) => d + String.fromCharCode(b), ''));
                    ws.send(JSON.stringify({ type: 'audio', data: b64, format: 'pcm_s16le', sampleRate: 16000 }));
                };
                source.connect(processor);
                processor.connect(audioContext.destination);
                (streamRef.current as any)._audioContext = audioContext;
                (streamRef.current as any)._processor = processor;
            };

            ws.onmessage = async (e) => handleServerMessage(JSON.parse(e.data));

            ws.onerror = () => {
                setIsConnecting(false);
                setAgentState('error');
                setStatusMessage('Connection error');
            };

            ws.onclose = () => {
                setIsConnecting(false);
                if (isRecordingRef.current) {
                    handleRetry();
                } else {
                    setAgentState('idle');
                    setStatusMessage('Session ended');
                }
            };
        } catch (err) {
            setIsConnecting(false);
            setAgentState('error');
            setStatusMessage('Microphone access denied');
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        setAgentState('idle');
        setStatusMessage('Session ended');

        if (playerRef.current) { playerRef.current.flush(); playerRef.current = null; }
        if (streamRef.current) {
            const ctx = (streamRef.current as any)._audioContext;
            const proc = (streamRef.current as any)._processor;
            if (proc) proc.disconnect();
            if (ctx && ctx.state !== 'closed') ctx.close();
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }
        setAnalyser(null);
        setOutputAnalyser(null);
    };

    const active = isRecording || isDemoRunning;
    const currentAnalyser = agentState === 'speaking' ? outputAnalyser : analyser;
    const visualizerColor = agentState === 'speaking' ? '#6366f1' : '#10b981';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="flex flex-col items-center gap-16 max-w-4xl w-full">
                {/* Header Section */}
                <div className="text-center space-y-6 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-sm font-medium text-indigo-400">Enterprise AI Voice Solution</span>
                    </div>
                    <h1 className="text-6xl font-bold text-white tracking-tight leading-tight">
                        Urdu Voice <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            AI Agent
                        </span>
                    </h1>
                </div>

                {/* Visualizer Section */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl" />
                    <div className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-12">
                        <RadialAudioVisualizer
                            analyser={currentAnalyser}
                            state={agentState}
                            color={visualizerColor}
                            size={400}
                            barCount={48}
                        />
                        
                        {/* Status Badge */}
                        <div className="absolute top-6 right-6">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                                agentState === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                agentState === 'speaking' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                agentState === 'listening' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    agentState === 'error' ? 'bg-red-500' :
                                    agentState === 'speaking' ? 'bg-indigo-500 animate-pulse' :
                                    agentState === 'listening' ? 'bg-emerald-500 animate-pulse' :
                                    'bg-slate-500'
                                }`} />
                                {statusMessage}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="flex flex-col items-center gap-6 w-full max-w-md">
                    <div className="text-center space-y-2">
                        <p className="text-slate-400 text-sm">
                            {agentState === 'idle' && 'Click below to start experiencing our AI voice technology'}
                            {agentState === 'connecting' && 'Establishing secure connection...'}
                            {agentState === 'listening' && 'AI is listening to your voice input'}
                            {agentState === 'processing' && 'Processing your request with advanced NLP'}
                            {agentState === 'speaking' && 'AI is generating natural voice response'}
                            {agentState === 'error' && 'Connection interrupted - please retry'}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isConnecting}
                            className={`flex-1 px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed
                                ${isRecording
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25'
                                }`}
                        >
                            {isConnecting ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> Connecting...</>
                            ) : isRecording ? (
                                <><Square className="w-5 h-5" /> End Session</>
                            ) : (
                                <><Mic className="w-5 h-5" /> Start Demo</>
                            )}
                        </button>

                        {agentState === 'error' && (
                            <button
                                onClick={handleRetry}
                                className="px-6 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Retry
                            </button>
                        )}
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex items-center gap-6 pt-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <span>Enterprise Security</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>GDPR Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            <span>Scalable Architecture</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
