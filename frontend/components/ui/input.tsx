import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightHint?: React.ReactNode;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightHint, mono, ...props }, ref) => (
    <div className="relative flex items-center w-full">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 pointer-events-none flex items-center">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "h-9 w-full bg-input border border-border rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
          "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          leftIcon && "pl-9",
          rightHint && "pr-12",
          mono && "font-mono",
          className,
        )}
        {...props}
      />
      {rightHint && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.08em] text-foreground/55 pointer-events-none">
          {rightHint}
        </span>
      )}
    </div>
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
      "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      "min-h-[80px] resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
