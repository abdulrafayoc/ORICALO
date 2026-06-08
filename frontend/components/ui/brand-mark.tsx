"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useVoicePresence } from "@/context/voice-presence";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: number;
  pulse?: boolean;
  className?: string;
}

export function BrandMark({ size = 32, pulse = false, className }: BrandMarkProps) {
  const reduce = useReducedMotion();
  const Inner = pulse ? PulsingBrand : StaticBrand;
  return <Inner size={size} reduce={!!reduce} className={className} />;
}

function StaticBrand({ size, className }: { size: number; reduce: boolean; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-flex items-center justify-center border-[1.5px] border-accent rounded-none bg-background",
        className,
      )}
    >
      <span className="font-serif font-semibold text-accent" style={{ fontSize: size * 0.5 }}>
        O
      </span>
      <span
        className="absolute -right-[3px] -top-[3px] rounded-full bg-foreground/40"
        style={{ width: size * 0.2, height: size * 0.2 }}
      />
    </div>
  );
}

function PulsingBrand({
  size,
  reduce,
  className,
}: {
  size: number;
  reduce: boolean;
  className?: string;
}) {
  const { status, amplitude } = useVoicePresence();
  const isActive = status !== "idle";

  const dotScale = reduce
    ? 1
    : status === "speaking"
      ? 1 + amplitude * 0.4
      : 1;
  const dotOpacity = reduce
    ? 1
    : status === "listening"
      ? undefined
      : 1;

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-flex items-center justify-center border-[1.5px] rounded-none bg-background",
        isActive ? "border-accent" : "border-accent/40",
        className,
      )}
    >
      <span
        className={cn(
          "font-serif font-semibold",
          isActive ? "text-accent" : "text-accent/60",
        )}
        style={{ fontSize: size * 0.5 }}
      >
        O
      </span>
      <motion.span
        className="absolute -right-[3px] -top-[3px] rounded-full"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          background: isActive ? "var(--accent)" : "rgba(245,240,229,0.4)",
          boxShadow: isActive ? "0 0 10px var(--accent)" : "none",
        }}
        animate={{
          scale: dotScale,
          opacity: status === "listening" && !reduce ? [1, 0.5, 1] : dotOpacity,
        }}
        transition={
          status === "listening" && !reduce
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 280, damping: 18 }
        }
      />
    </div>
  );
}
