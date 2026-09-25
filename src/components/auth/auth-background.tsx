"use client";

import { useReducedMotion } from "motion/react";
import Aurora from "@/components/Aurora";

/** ADTRAXIO-themed aurora: near-black base with restrained lime glow */
const ADTRAXIO_AURORA_STOPS = ["#0a0a0b", "#8fbc24", "#1a2410"];

export function AuthBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 bg-background">
        <div className="gradient-radial-accent absolute inset-0 opacity-60" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 bg-background">
      <div className="absolute inset-0 opacity-70">
        <Aurora
          colorStops={ADTRAXIO_AURORA_STOPS}
          amplitude={0.85}
          blend={0.55}
          speed={0.35}
        />
      </div>
      <div className="gradient-radial-accent absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-background/55" />
    </div>
  );
}
