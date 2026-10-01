import { Reveal } from "@/components/motion/reveal";
import { StatCard } from "@/components/ui/stat-card";
import { GrowthChart } from "@/components/ui/growth-chart";
import { Sparkles } from "lucide-react";

export function AnalyticsSection() {
  return (
    <section id="analyze" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
            Know what&apos;s working.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-12 rounded-lg border border-border bg-adtraxio-surface p-5 glow-accent-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-medium">Analytics</span>
              <span className="text-[10px] text-muted-foreground">
                This week
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
              <StatCard label="Reach" value="156K" change="+8.2%" />
              <StatCard label="Engagement" value="9.4K" change="+5.1%" />
              <StatCard label="Followers" value="+312" change="+12%" />
              <StatCard label="Profile visits" value="4.2K" change="+18%" />
              <StatCard
                label="Conversions"
                value="94"
                change="+6"
                className="col-span-2 sm:col-span-1"
              />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-md border border-border bg-background/50 p-4">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Performance over time
                </p>
                <GrowthChart height={120} />
              </div>

              <div className="flex flex-col justify-between rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent-muted p-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-adtraxio-accent" />
                    <p className="text-[10px] font-medium text-adtraxio-accent">
                      AI Insight
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                    Your educational Reels generated 68% of this week&apos;s
                    reach.
                  </p>
                </div>
                <div className="mt-4 border-t border-adtraxio-accent/20 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    Create 3 more this week.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
