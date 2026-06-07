import type { Transition, Variants } from "framer-motion";

export const spring = {
  snappy: { type: "spring", stiffness: 380, damping: 32 } satisfies Transition,
  gentle: { type: "spring", stiffness: 180, damping: 24 } satisfies Transition,
  lazy: { type: "spring", stiffness: 90, damping: 22 } satisfies Transition,
  elastic: { type: "spring", stiffness: 260, damping: 14 } satisfies Transition,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: spring.gentle },
  exit: { opacity: 0, x: 8, transition: spring.gentle },
};

export function stagger(delayPerChild = 0.04): Variants {
  return {
    visible: { transition: { staggerChildren: delayPerChild } },
  };
}
