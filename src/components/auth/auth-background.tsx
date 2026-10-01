"use client";

import { useReducedMotion } from "motion/react";
import Aurora from "@/components/Aurora";

/** ADTRAXIO-themed aurora: near-black base with visible restrained lime glow */
const ADTRAXIO_AURORA_STOPS = ["#050506", "#a8d636", "#142010"];

export function AuthBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 bg-background">
        <div className="gradient-radial-accent absolute inset-0 opacity-90" />
        <div
          className="absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 85% 95%, oklch(0.82 0.17 128 / 22%), transparent 70%)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 bg-background">
      <div className="absolute inset-0 opacity-100">
        <Aurora
          colorStops={ADTRAXIO_AURORA_STOPS}
          amplitude={1.15}
          blend={0.72}
          speed={0.42}
        />
      </div>
      <div className="gradient-radial-accent absolute inset-0 opacity-85" />
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 15% 20%, oklch(0.82 0.17 128 / 16%), transparent 65%), radial-gradient(ellipse 75% 55% at 90% 85%, oklch(0.82 0.17 128 / 20%), transparent 70%)",
        }}
      />
      {/* Light veil so form stays readable — was 55% and hid the aurora */}
      <div className="absolute inset-0 bg-background/28" />
    </div>
  );
}
