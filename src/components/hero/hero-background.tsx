"use client";

import { useReducedMotion } from "motion/react";
import DarkVeil from "@/components/DarkVeil";

export function HeroBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 gradient-radial-accent" />
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 hidden opacity-[0.35] lg:block">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent_85%)]">
          <DarkVeil
            hueShift={118}
            speed={0.12}
            warpAmount={0}
            noiseIntensity={0}
            scanlineIntensity={0}
            resolutionScale={0.45}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 gradient-radial-accent lg:opacity-60" />
    </>
  );
}
