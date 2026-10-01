"use client";

import { Reveal } from "@/components/motion/reveal";
import { AUDIENCE_SEGMENTS } from "@/lib/design/marketing";

export function HomeAudience() {
  return (
    <section className="border-y border-border/80 py-14 sm:py-16">
      <div className="marketing-container">
        <Reveal>
          <p className="text-center text-sm text-muted-foreground">
            Built for teams who run social as a growth channel — not a side task.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {AUDIENCE_SEGMENTS.map((segment) => (
              <li
                key={segment}
                className="text-sm text-foreground/55 transition-colors hover:text-foreground/80"
              >
                {segment}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
