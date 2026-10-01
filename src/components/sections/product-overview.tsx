"use client";

import FadeContent from "@/components/FadeContent";
import { HomeWorkspaceMockup } from "@/components/mockups/home-workspace-mockup";
import { Reveal } from "@/components/motion/reveal";

const features = [
  {
    title: "AI Content",
    description:
      "Generate hooks, scripts, captions and content plans.",
  },
  {
    title: "Campaigns",
    description: "Plan, manage and measure campaigns.",
  },
  {
    title: "Analytics",
    description: "Understand what's working and what to do next.",
  },
];

export function ProductOverview() {
  return (
    <section id="workspace" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <FadeContent blur={false} duration={800} threshold={0.15}>
          <h2 className="font-heading max-w-xl text-3xl tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            One workspace. Your entire social operation.
          </h2>
        </FadeContent>

        <div className="relative mt-16">
          <Reveal delay={0.15}>
            <HomeWorkspaceMockup />
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={0.2 + i * 0.1}>
                <div className="rounded-md border border-border bg-adtraxio-surface/50 p-6 transition-colors hover:border-border hover:bg-adtraxio-surface">
                  <p className="text-xs font-medium uppercase tracking-wider text-adtraxio-accent">
                    {feature.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
