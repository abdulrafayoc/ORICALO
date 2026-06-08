"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "declined") => {
    localStorage.setItem("cookie_consent", choice);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={spring.gentle}
          className="fixed bottom-5 left-5 right-5 md:left-auto md:right-6 md:max-w-md z-[100]"
        >
          <div className="bg-popover border border-border rounded-md p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-grow">
                <h4 className="font-serif text-base text-foreground mb-1">
                  Cookie policy
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  We use cookies to improve your experience, analyze traffic,
                  and show personalized content.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConsent("accepted")}
                    className="flex-1"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConsent("declined")}
                    className="flex-1"
                  >
                    Decline
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
