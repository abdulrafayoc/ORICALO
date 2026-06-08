"use client";

import { useEffect, useRef } from "react";

const MINT = "#7fa37f";
const PALE = "#c4d4b8";
const IDLE = "rgba(245,240,229,0.25)";

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

export default function WaveformVisualizer({
  analyser,
  isRecording,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      if (!analyser || !isRecording) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = IDLE;
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 2);
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = PALE;
      ctx.shadowBlur = 8;
      ctx.shadowColor = MINT;
      ctx.beginPath();

      const sliceWidth = rect.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] ?? 0) / 128.0;
        const y = (v * rect.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    if (isRecording) {
      draw();
    } else {
      draw();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full h-full rounded-sm overflow-hidden bg-card border border-border">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
