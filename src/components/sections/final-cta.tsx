"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { MARKETING_CTA } from "@/lib/design/marketing";

export function FinalCta() {
  return (
    <section className="border-t border-border/80 py-20 sm:py-28">
      <div className="marketing-container">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Start with the workspace. Grow from real data.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Create content, run campaigns, and use Growth Copilot on the same
              platform you saw on this page — no separate tools required.
            </p>
            <Button
              size="cta"
              className="mt-8 bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
              asChild
            >
              <Link href={MARKETING_CTA.primaryHref}>
                {MARKETING_CTA.primary}
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
