import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Subtle page fade — respects the user's reduced-motion preference. */
export function PageFade({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/** Card entrance with optional stagger index. */
export function Rise({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div style={{ height: "100%" }} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 8) * 0.05, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
