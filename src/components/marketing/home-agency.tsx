"use client";

import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";
import { MARKETING_CTA } from "@/lib/design/marketing";

const capabilities = [
  "Client workspaces with clear context switching",
  "Campaign and content approvals",
  "Collaboration, comments, and activity",
  "Client-ready reporting and exports",
];

export function HomeAgency() {
  return (
    <section id="teams" className="border-y border-border/80 py-20 sm:py-28">
      <div className="marketing-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-16">
          <Reveal>
            <SectionHeading
              eyebrow="For teams & agencies"
              title="Every client workspace stays isolated — and visible."
              lead="Switch between brands without losing permissions, approvals, or performance context. ADTRAXIO is built for operators who manage more than one growth story."
            />
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="space-y-4 border-t border-border/80 pt-6 lg:border-t-0 lg:pt-0">
              {capabilities.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span
                    className="mt-2 size-1 shrink-0 rounded-full bg-adtraxio-accent"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant="outline"
              size="cta"
              className="mt-8 border-border/80"
            >
              <Link href={MARKETING_CTA.primaryHref}>
                {MARKETING_CTA.primary}
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
