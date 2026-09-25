"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className={cn(
        "rounded-lg border border-border bg-adtraxio-surface/90 p-6 shadow-xl backdrop-blur-md sm:p-8",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
