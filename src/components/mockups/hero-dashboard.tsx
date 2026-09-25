"use client";

import { motion } from "framer-motion";
import { Sparkles, BarChart3, Users, Eye } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { GrowthChart } from "@/components/ui/growth-chart";
import { Float } from "@/components/motion/float";
import SpotlightCard from "@/components/SpotlightCard";
import { cn } from "@/lib/utils";

const floatingCardClass =
  "rounded-md border border-border/80 bg-adtraxio-surface-elevated/95 px-3.5 py-2.5 shadow-xl backdrop-blur-sm";

export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-2xl px-6 py-10 sm:px-10 sm:py-12">
      <SpotlightCard
        spotlightColor="rgba(180, 230, 100, 0.12)"
        className="relative z-[1] glow-accent rounded-lg border border-border bg-adtraxio-surface p-0"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="p-4 sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded bg-adtraxio-accent-muted">
                <BarChart3 className="size-3.5 text-adtraxio-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">
                Growth Overview
              </span>
            </div>
            <span className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              Last 7 days
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <StatCard label="Reach" value="284K" change="+32.8%" />
            <StatCard label="Engagement" value="18.4K" change="+12.1%" />
            <StatCard label="Followers" value="12.8K" change="+847" />
            <StatCard label="Campaign ROI" value="3.2×" change="+0.4×" />
          </div>

          <div className="mt-3 rounded-md border border-border bg-background/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Growth trend
              </span>
              <span className="text-[10px] text-adtraxio-accent">+24.6%</span>
            </div>
            <GrowthChart height={72} />
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent-muted p-3">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-adtraxio-accent" />
            <div>
              <p className="text-[11px] font-medium text-adtraxio-accent">
                AI Recommendation
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Publish 3 educational Reels this week. They generated 2.7× more
                engagement than promotional posts.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Eye className="size-3" />
                Top post reach
              </div>
              <p className="mt-1 text-sm font-semibold">48.2K</p>
            </div>
            <div className="rounded-md border border-border p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Users className="size-3" />
                Active campaign
              </div>
              <p className="mt-1 text-sm font-semibold">Lead Gen · Day 8/14</p>
            </div>
          </div>
        </motion.div>
      </SpotlightCard>

      <Float
        className="absolute left-0 top-[6%] z-10 hidden sm:block lg:-left-2 xl:-left-6"
        delay={0}
        duration={5}
        y={4}
      >
        <div className={cn(floatingCardClass, "max-w-[148px]")}>
          <p className="text-[10px] font-medium text-adtraxio-accent">
            AI Growth Insight
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Educational content trending
          </p>
        </div>
      </Float>

      <Float
        className="absolute right-0 top-[14%] z-10 hidden sm:block lg:-right-1 xl:-right-5"
        delay={1.6}
        duration={4.2}
        y={3}
      >
        <div className={cn(floatingCardClass, "text-center")}>
          <p className="text-sm font-semibold text-adtraxio-accent">+32.8%</p>
          <p className="text-[10px] text-muted-foreground">Reach this week</p>
        </div>
      </Float>

      <Float
        className="absolute bottom-[8%] right-[4%] z-20 hidden sm:block lg:right-[2%] xl:-right-2"
        delay={0.8}
        duration={5.5}
        y={4}
      >
        <div className={floatingCardClass}>
          <p className="text-[10px] font-medium text-foreground">
            3 posts ready
          </p>
          <p className="text-[10px] text-muted-foreground">Scheduled for Tue</p>
        </div>
      </Float>
    </div>
  );
}
