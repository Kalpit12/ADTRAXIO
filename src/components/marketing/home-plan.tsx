"use client";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

export function HomePlan() {
  return (
    <section id="plan" className="border-y border-border/80 bg-adtraxio-surface/20 py-20 sm:py-28">
      <div className="marketing-container">
        <Reveal>
          <SectionHeading
            eyebrow="Plan"
            title="Turn performance into your next move."
            lead="Growth Intelligence, strategic plans, experiments, and optimization proposals — grounded in your workspace data, not generic AI guesses."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              "Weekly growth briefs from measured changes",
              "Strategic and execution plans you can approve",
              "Controlled experiments with clear outcomes",
            ].map((item) => (
              <li
                key={item}
                className="border-t border-border/80 pt-4 text-sm leading-relaxed text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
