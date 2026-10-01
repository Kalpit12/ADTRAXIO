import { Button } from "@/components/ui/button";
import { SectionImage } from "@/components/ui/section-image";
import { Reveal } from "@/components/motion/reveal";
import { Sparkles } from "lucide-react";
import { homepageImages } from "@/lib/images";

export function CampaignsSection() {
  const image = homepageImages.socialPhoneFeed;

  return (
    <section id="act" className="border-y border-border/80 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <SectionImage
                src={image.src}
                alt={image.alt}
                credit={image.credit}
                overlay="bottom"
                className="aspect-[4/3] w-full lg:aspect-[5/4]"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-heading mt-8 text-3xl tracking-tight text-foreground sm:text-4xl">
                Turn content into campaigns.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Plan campaigns with clear goals, budgets, and audiences. ADTRAXIO
                suggests creatives and variations — you stay in control.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="rounded-lg border border-border bg-adtraxio-surface p-5 glow-accent-sm">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-medium">Campaign Builder</span>
                <span className="text-[10px] text-muted-foreground">Draft</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Campaign goal
                    </p>
                    <p className="mt-1 text-sm font-medium">Generate leads</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Budget
                    </p>
                    <p className="mt-1 text-sm font-medium">KES 20,000</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Duration
                    </p>
                    <p className="mt-1 text-sm font-medium">14 days</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Audience
                    </p>
                    <p className="mt-1 text-sm font-medium">Nairobi · 18–35</p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-background/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Platforms
                  </p>
                  <div className="mt-2 flex gap-2">
                    {["Instagram", "Facebook"].map((p) => (
                      <span
                        key={p}
                        className="rounded border border-border px-2 py-0.5 text-xs text-foreground/80"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent-muted p-3">
                  <Sparkles className="size-3.5 shrink-0 text-adtraxio-accent" />
                  <div>
                    <p className="text-[10px] font-medium text-adtraxio-accent">
                      AI Recommendation
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      4 creatives · 2 audiences · 3 variations
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <Button
                  size="sm"
                  className="bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
                >
                  Build campaign
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
