import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 border border-accent/30",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        outline:
          "bg-transparent text-foreground border border-border hover:bg-muted",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        icon:
          "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-sm",
        md: "h-9 px-4 text-sm rounded-md",
        lg: "h-11 px-6 text-base rounded-md",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
