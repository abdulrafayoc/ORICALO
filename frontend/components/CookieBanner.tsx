'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: 'accepted' | 'declined') => {
    localStorage.setItem('cookie_consent', choice);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100]"
        >
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-grow">
                <h4 className="text-white font-bold mb-1">Cookie Policy</h4>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                  We use cookies to improve your experience, analyze traffic, and show you personalized content.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleConsent('accepted')}
                    className="flex-grow bg-emerald-500 text-black font-bold py-2.5 rounded-xl hover:bg-emerald-400 transition-all text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleConsent('declined')}
                    className="flex-grow bg-white/5 text-white font-bold py-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-neutral-500 hover:text-white"
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
