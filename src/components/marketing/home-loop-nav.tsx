"use client";

import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { GROWTH_LOOP } from "@/lib/design/marketing";
import { cn } from "@/lib/utils";

export function HomeLoopNav() {
  return (
    <section
      aria-label="ADTRAXIO growth loop"
      className="py-16 sm:py-20"
    >
      <div className="marketing-container">
        <Reveal>
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Create · Analyze · Plan · Act · Learn
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <ul className="mt-8 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {GROWTH_LOOP.map((step, i) => (
              <li key={step.id} className="min-w-[11.5rem] shrink-0 sm:min-w-0">
                <Link
                  href={step.href}
                  className={cn(
                    "group flex h-full flex-col border border-border/80 bg-adtraxio-surface/30 p-4 transition-colors",
                    "hover:border-adtraxio-accent/35 hover:bg-adtraxio-surface/50",
                    i === 0 && "sm:rounded-l-md",
                    i === GROWTH_LOOP.length - 1 && "sm:rounded-r-md"
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-adtraxio-accent">
                    {step.label}
                  </span>
                  <span className="mt-2 text-sm leading-snug text-foreground/90">
                    {step.tagline}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
