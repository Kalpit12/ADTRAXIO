"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroDashboard } from "@/components/mockups/hero-dashboard";
import { HeroBackground } from "@/components/hero/hero-background";
import BlurText from "@/components/BlurText";
import ShinyText from "@/components/ShinyText";
import FadeContent from "@/components/FadeContent";

const platforms = ["Instagram", "Facebook", "TikTok", "LinkedIn"];

const primaryCtaClass =
  "bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90";

export function Hero() {
  return (
    <section className="relative overflow-x-clip pt-28 pb-20 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-32">
      <HeroBackground />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em]">
              <ShinyText
                text="SOCIAL GROWTH REIMAGINED"
                speed={3.5}
                color="oklch(0.62 0.12 128)"
                shineColor="oklch(0.88 0.18 128)"
                spread={100}
                className="uppercase tracking-[0.25em]"
              />
            </p>

            <h1 className="font-heading mt-5 text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              <BlurText
                text="Turn your social media into a growth engine."
                animateBy="words"
                delay={70}
                stepDuration={0.3}
                threshold={0.2}
                className="font-heading text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]"
              />
            </h1>

            <FadeContent
              blur={false}
              duration={700}
              delay={400}
              threshold={0.05}
              className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Create better content, launch smarter campaigns, and understand
              what&apos;s actually driving your growth — all from one AI-powered
              platform.
            </FadeContent>

            <FadeContent blur={false} duration={600} delay={550} threshold={0.05}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="cta" className={primaryCtaClass} asChild>
                  <Link href="/signup">Start for free</Link>
                </Button>
                <Button variant="outline" size="cta" className="border-border" asChild>
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>
            </FadeContent>

            <FadeContent blur={false} duration={600} delay={650} threshold={0.05}>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
                {platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs text-muted-foreground/70"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </FadeContent>
          </div>

          <FadeContent blur duration={900} delay={300} threshold={0.05}>
            <div className="relative overflow-visible lg:pl-4">
              <HeroDashboard />
            </div>
          </FadeContent>
        </div>
      </div>
    </section>
  );
}
