"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionImage } from "@/components/ui/section-image";
import FadeContent from "@/components/FadeContent";
import ShinyText from "@/components/ShinyText";
import { homepageImages } from "@/lib/images";

export function FinalCta() {
  const image = homepageImages.agencyPresentation;

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <FadeContent blur={false} duration={800} threshold={0.2}>
          <div className="relative overflow-hidden rounded-lg border border-border bg-adtraxio-surface">
            <div className="grid lg:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-center px-8 py-16 sm:px-12 sm:py-20 lg:py-24">
                <div className="gradient-radial-accent pointer-events-none absolute inset-0 lg:hidden" />
                <div className="relative">
                  <h2 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    Your next growth move starts here.
                  </h2>
                  <p className="mt-4 max-w-md text-base">
                    <ShinyText
                      text="Create smarter. Campaign better. Grow faster."
                      speed={4}
                      color="oklch(0.62 0.015 90)"
                      shineColor="oklch(0.96 0.008 90)"
                      spread={110}
                    />
                  </p>
              <Button
                size="cta"
                className="mt-8 bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
                asChild
              >
                <Link href="/signup">Start for free</Link>
              </Button>
                </div>
              </div>

              <SectionImage
                src={image.src}
                alt={image.alt}
                credit={image.credit}
                overlay="left"
                className="relative min-h-[240px] lg:min-h-[360px] lg:rounded-none lg:border-0 lg:border-l lg:border-border"
              />
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
