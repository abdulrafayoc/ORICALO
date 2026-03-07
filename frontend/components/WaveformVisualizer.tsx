"use client";

import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
    analyser: AnalyserNode | null;
    isRecording: boolean;
}

export default function WaveformVisualizer({ analyser, isRecording }: WaveformVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions to match DPI (sharp rendering)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Configuration
        const bufferLength = analyser ? analyser.frequencyBinCount : 0;
        const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

        const draw = () => {
            if (!analyser || !isRecording) {
                // Idle state animation (flat line or gentle pulse)
                ctx.clearRect(0, 0, rect.width, rect.height);

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#333'; // Dark gray idle
                ctx.beginPath();
                ctx.moveTo(0, rect.height / 2);
                ctx.lineTo(rect.width, rect.height / 2);
                ctx.stroke();

                return;
            }

            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade effect
            ctx.clearRect(0, 0, rect.width, rect.height);

            ctx.lineWidth = 2;
            // Emerald glow
            ctx.strokeStyle = '#34d399'; // emerald-400
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981'; // emerald-500

            ctx.beginPath();

            const sliceWidth = rect.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * rect.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(rect.width, rect.height / 2);
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset for performance
        };

        if (isRecording) {
            draw();
        } else {
            // Draw one idle frame
            draw();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, isRecording]);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-black/40 backdrop-blur-sm border border-neutral-800/50 shadow-inner block">
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
            />
        </div>
    );
}
