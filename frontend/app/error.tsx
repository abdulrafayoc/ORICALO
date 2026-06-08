"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background paper-noise px-4">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-14 h-14 rounded-sm border border-destructive/30 bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="font-serif italic text-2xl text-foreground mb-2">
            Something broke
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {process.env.NODE_ENV === "development"
              ? error.message
              : "An unexpected error occurred loading this page."}
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-3">
              Error ID · {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset}>
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
