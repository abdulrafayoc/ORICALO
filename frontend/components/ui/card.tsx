import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { live?: boolean }
>(({ className, live, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-md border border-border bg-card text-card-foreground",
      live && "hover:ring-1 hover:ring-accent/40 transition-shadow",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-baseline justify-between p-4 pb-3", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-serif text-base leading-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardMeta = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground",
      className,
    )}
    {...props}
  />
));
CardMeta.displayName = "CardMeta";

export const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));
CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-end gap-2 p-4 pt-3 border-t border-border",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
