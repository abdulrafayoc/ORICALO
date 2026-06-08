import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  liveDot?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export function Avatar({ name, liveDot, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-muted border border-border font-serif text-foreground",
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {initials(name)}
      {liveDot && (
        <span className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-card" />
      )}
    </div>
  );
}
