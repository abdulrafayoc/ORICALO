"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { fadeUp, fadeIn, spring } from "@/lib/motion";

type Variant = "fadeUp" | "fadeIn";

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: Variant;
}

export function PageTransition({
  children,
  variant = "fadeUp",
}: PageTransitionProps) {
  const pathname = usePathname();
  const v = variant === "fadeUp" ? fadeUp : fadeIn;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={v}
        transition={variant === "fadeUp" ? spring.lazy : { duration: 0.18 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
