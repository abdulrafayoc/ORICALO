"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatNumber, formatPKR, formatDuration } from "@/lib/format";
import { spring } from "@/lib/motion";

type Format = "number" | "pkr" | "duration";

interface TickerProps {
  value: number;
  format?: Format;
  duration?: number;
  className?: string;
  pkrStyle?: "phrase" | "numeric";
}

function render(value: number, format: Format, pkrStyle?: "phrase" | "numeric"): string {
  if (format === "pkr") return formatPKR(value, { style: pkrStyle });
  if (format === "duration") return formatDuration(value);
  return formatNumber(value);
}

export function Ticker({
  value,
  format = "number",
  duration = 0.9,
  pkrStyle = "phrase",
  className,
}: TickerProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => render(value, format, pkrStyle));
  const prevValue = useRef<number>(value);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(render(value, format, pkrStyle));
      prevValue.current = value;
      return;
    }
    const controls = animate(prevValue.current, value, {
      ...spring.elastic,
      duration,
      onUpdate: (latest) => setDisplay(render(latest, format, pkrStyle)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, format, duration, pkrStyle, reduceMotion]);

  return (
    <span className={className} aria-live="polite">
      {display}
    </span>
  );
}
