import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm border",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border-border",
        mint: "bg-accent/15 text-accent border-accent/30",
        warning: "bg-yellow-900/20 text-yellow-200 border-yellow-700/40",
        danger: "bg-destructive/15 text-destructive border-destructive/30",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
