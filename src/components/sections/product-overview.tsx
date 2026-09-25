"use client";

import FadeContent from "@/components/FadeContent";
import { Reveal } from "@/components/motion/reveal";
import { StatCard } from "@/components/ui/stat-card";
import { GrowthChart } from "@/components/ui/growth-chart";
import { Sparkles } from "lucide-react";

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
    <section id="product" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <FadeContent blur={false} duration={800} threshold={0.15}>
          <h2 className="font-heading max-w-xl text-3xl tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            One workspace. Your entire social operation.
          </h2>
        </FadeContent>

        <div className="relative mt-16">
          <Reveal delay={0.15}>
            <div className="mx-auto max-w-3xl rounded-lg border border-border bg-adtraxio-surface p-5 glow-accent-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-medium tracking-wide">
                  ADTRAXIO Dashboard
                </span>
                <div className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <StatCard label="Reach" value="412K" change="+18.2%" />
                <StatCard label="Engagement" value="24.1K" change="+9.4%" />
                <StatCard label="Followers" value="18.3K" change="+1.2K" />
                <StatCard label="Conversions" value="847" change="+22%" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2 rounded-md border border-border bg-background/50 p-3">
                  <GrowthChart height={100} />
                </div>
                <div className="flex items-start gap-2 rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent-muted p-3">
                  <Sparkles className="size-3.5 shrink-0 text-adtraxio-accent" />
                  <div>
                    <p className="text-[10px] font-medium text-adtraxio-accent">
                      AI Insight
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Reels outperform static posts 3.1× this month.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
