"use client";

import { Radio, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * @deprecated Use components/ui/status-dot.tsx (StatusDot) for simple dot indicators.
 * This richer indicator (dot + icon + status text) is kept for the console page
 * until P5 — at which point the console page is repainted and this file is deleted.
 */
export type ModelStatus = "disconnected" | "connected" | "loading" | "ready" | "error" | "warning";

interface StatusIndicatorProps {
  modelStatus: ModelStatus;
  statusMessage: string;
}

const STATUS_CONFIG = {
  disconnected: { dot: "bg-foreground/40", iconClass: "text-muted-foreground", icon: Radio, pulse: false },
  connected: { dot: "bg-accent", iconClass: "text-accent", icon: Radio, pulse: true },
  loading: { dot: "bg-yellow-500", iconClass: "text-yellow-400", icon: Loader2, pulse: true },
  ready: { dot: "bg-accent shadow-[0_0_8px_currentColor] text-accent", iconClass: "text-accent", icon: CheckCircle2, pulse: false },
  error: { dot: "bg-destructive", iconClass: "text-destructive", icon: AlertCircle, pulse: false },
  warning: { dot: "bg-yellow-500", iconClass: "text-yellow-400", icon: AlertCircle, pulse: true },
  waiting: { dot: "bg-yellow-500", iconClass: "text-yellow-400", icon: Loader2, pulse: true },
  reset: { dot: "bg-foreground/40", iconClass: "text-muted-foreground", icon: Radio, pulse: false },
} as const;

export function StatusIndicator({ modelStatus, statusMessage }: StatusIndicatorProps) {
  const config =
    STATUS_CONFIG[modelStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.disconnected;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`relative w-2 h-2 rounded-full ${config.dot}`}>
        {config.pulse && (
          <div className={`absolute inset-0 rounded-full ${config.dot} animate-ping opacity-75`} />
        )}
      </div>
      <Icon className={`w-4 h-4 ${config.iconClass} ${modelStatus === "loading" ? "animate-spin" : ""}`} />
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground max-w-[300px] truncate">
        {statusMessage}
      </span>
    </div>
  );
}
