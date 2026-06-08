import * as React from "react";
import { cn } from "@/lib/utils";

type State = "idle" | "live" | "error";
type Size = "xs" | "sm" | "md";

const sizeMap = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
};
const stateMap = {
  idle: "bg-foreground/40",
  live: "bg-accent shadow-[0_0_8px_currentColor] text-accent",
  error: "bg-destructive shadow-[0_0_8px_currentColor] text-destructive",
};

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  state?: State;
  size?: Size;
}

export function StatusDot({ state = "idle", size = "sm", className, ...props }: StatusDotProps) {
  return (
    <span
      className={cn("inline-block rounded-full", sizeMap[size], stateMap[state], className)}
      {...props}
    />
  );
}
