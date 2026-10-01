"use client";

import FadeContent from "@/components/FadeContent";
import { HomeCopilotMockup } from "@/components/mockups/home-copilot-mockup";
import { Reveal } from "@/components/motion/reveal";

export function AiSection() {
  return (
    <section id="growth-copilot" className="border-y border-border/80 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-adtraxio-accent">
                Growth Copilot
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-heading mt-5 text-3xl tracking-tight text-foreground sm:text-4xl">
                Don&apos;t just analyze your growth. Know what to do next.
              </h2>
            </Reveal>
          </div>

          <FadeContent blur duration={900} threshold={0.12}>
            <HomeCopilotMockup />
          </FadeContent>
        </div>
      </div>
    </section>
  );
}
