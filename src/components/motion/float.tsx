"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface FloatProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
}

export function Float({
  children,
  className,
  delay = 0,
  duration = 4.5,
  y = 5,
}: FloatProps) {
  return (
    <motion.div
      className={className}
      style={{ willChange: "transform" }}
      animate={{ y: [0, -y] }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "mirror",
        ease: [0.42, 0, 0.58, 1],
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
