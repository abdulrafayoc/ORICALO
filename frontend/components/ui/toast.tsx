"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors={false}
      visibleToasts={3}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "!bg-popover !border !border-border !text-foreground !font-sans !rounded-md !shadow-md",
          title: "!font-sans !text-sm",
          description:
            "!font-mono !text-[10px] !uppercase !tracking-[0.1em] !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
    />
  );
}

export const toast = sonnerToast;
