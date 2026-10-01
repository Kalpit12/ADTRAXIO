"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeroLiveBackground } from "@/components/marketing/hero-live-background";
import { HeroDashboard } from "@/components/mockups/hero-dashboard";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { HeroPlatformLogos } from "@/components/marketing/hero-platform-logos";
import { MARKETING_CTA } from "@/lib/design/marketing";

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-x-clip pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
      <HeroLiveBackground />

      <div className="marketing-container relative z-[1]">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11px] font-medium uppercase tracking-[0.24em] text-white"
          >
            {APP_TAGLINE}
          </motion.p>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading mt-6 text-[2.35rem] leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            The growth operating system for social teams.
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/95 sm:text-lg"
          >
            {APP_NAME} brings create, analyze, plan, act, and learn into one
            workspace — content studio, campaigns, publishing, analytics, and
            Growth Copilot included.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              size="cta"
              className="min-w-[10.5rem] bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
              asChild
            >
              <Link href={MARKETING_CTA.primaryHref}>
                {MARKETING_CTA.primary}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="min-w-[10.5rem] border-border/80"
              asChild
            >
              <Link href={MARKETING_CTA.secondaryHref}>
                {MARKETING_CTA.secondary}
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <HeroPlatformLogos />
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-14 sm:mt-16 lg:mt-20"
        >
          <div className="overflow-hidden rounded-lg border border-border/90 bg-adtraxio-surface/40 p-1 sm:p-1.5">
            <HeroDashboard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
