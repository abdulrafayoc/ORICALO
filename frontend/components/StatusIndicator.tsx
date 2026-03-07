"use client";

import { Radio, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type ModelStatus = "disconnected" | "connected" | "loading" | "ready" | "error" | "warning";

interface StatusIndicatorProps {
    modelStatus: ModelStatus;
    statusMessage: string;
}

const STATUS_CONFIG = {
    disconnected: { color: "bg-neutral-500", icon: Radio, pulse: false },
    connected: { color: "bg-blue-500", icon: Radio, pulse: true },
    loading: { color: "bg-yellow-500", icon: Loader2, pulse: true },
    ready: { color: "bg-emerald-500", icon: CheckCircle2, pulse: false },
    error: { color: "bg-red-500", icon: AlertCircle, pulse: false },
    warning: { color: "bg-orange-500", icon: AlertCircle, pulse: true },
    waiting: { color: "bg-yellow-500", icon: Loader2, pulse: true },
    reset: { color: "bg-blue-500", icon: Radio, pulse: false },
} as const;

export function StatusIndicator({ modelStatus, statusMessage }: StatusIndicatorProps) {
    const config = STATUS_CONFIG[modelStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.disconnected;
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
}
