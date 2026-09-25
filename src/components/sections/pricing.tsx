"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionImage } from "@/components/ui/section-image";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { homepageImages } from "@/lib/images";
import type { PublicPlan } from "@/lib/billing/types";

export function Pricing() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const image = homepageImages.socialAppsPhone;

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((res) => res.json())
      .then((data: { plans?: PublicPlan[] }) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-center text-3xl tracking-tight text-foreground sm:text-4xl">
            Start growing without the complexity.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted-foreground">
            Affordable pricing in Kenyan Shillings — built for creators and teams
            in East Africa.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <SectionImage
            src={image.src}
            alt={image.alt}
            credit={image.credit}
            overlay="full"
            className="mx-auto mt-10 aspect-[21/6] max-w-3xl"
          />
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.1}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-lg border p-6 transition-colors",
                  plan.highlighted
                    ? "border-adtraxio-accent/40 bg-adtraxio-accent-muted glow-accent-sm"
                    : "border-border bg-adtraxio-surface/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {plan.name}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">
                      {plan.priceLabel}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /month
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-adtraxio-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  size="cta"
                  className={cn(
                    "mt-8 w-full",
                    plan.highlighted
                      ? "bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
                      : ""
                  )}
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.id === "free" ? "/signup" : "/billing"}>
                    {plan.id === "free" ? "Start free" : "View plan"}
                  </Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
