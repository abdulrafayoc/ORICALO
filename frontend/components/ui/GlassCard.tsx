"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = false }: GlassCardProps) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { scale: 1.02, backgroundColor: "rgba(23, 23, 23, 0.8)" } : undefined}
            transition={{ duration: 0.2 }}
            className={cn(
                "bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 shadow-xl",
                "hover:border-white/10 transition-colors",
                className
            )}
        >
            {children}
        </motion.div>
    );
};
