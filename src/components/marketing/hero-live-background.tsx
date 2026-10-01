"use client";

import { useReducedMotion } from "motion/react";
import Aurora from "@/components/Aurora";

const HERO_AURORA_STOPS = ["#080809", "#9ecd3a", "#101810"];

/** Subtle animated backdrop for the marketing hero — matches auth aurora, lighter veil. */
export function HeroLiveBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="gradient-radial-accent absolute inset-0 opacity-80" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.82 0.17 128 / 14%), transparent 55%)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-95">
        <Aurora
          colorStops={HERO_AURORA_STOPS}
          amplitude={0.92}
          blend={0.62}
          speed={0.3}
        />
      </div>
      <div className="gradient-radial-accent absolute inset-0 opacity-80" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 0%, oklch(0.82 0.17 128 / 12%), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/40 to-background"
      />
    </div>
  );
}
