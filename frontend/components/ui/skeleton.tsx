import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
        "before:animate-[paper-shimmer_1.6s_ease-in-out_infinite] before:bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}
