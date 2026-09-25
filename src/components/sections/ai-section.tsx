"use client";

import { Button } from "@/components/ui/button";
import FadeContent from "@/components/FadeContent";
import { Reveal } from "@/components/motion/reveal";
import { Sparkles } from "lucide-react";

export function AiSection() {
  return (
    <section id="ai" className="border-y border-border bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-adtraxio-accent">
                Your AI Growth Manager
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-heading mt-5 text-3xl tracking-tight text-foreground sm:text-4xl">
                Don&apos;t just analyze your growth. Know what to do next.
              </h2>
            </Reveal>
          </div>

          <FadeContent blur duration={900} threshold={0.12}>
            <div className="rounded-lg border border-border bg-adtraxio-surface p-1 glow-accent-sm">
              <div className="rounded-md border border-border bg-background p-4">
                <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                  <div className="flex size-6 items-center justify-center rounded bg-adtraxio-accent-muted">
                    <Sparkles className="size-3.5 text-adtraxio-accent" />
                  </div>
                  <span className="text-xs font-medium">ADTRAXIO AI</span>
                  <span className="ml-auto rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    Live
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-md border border-border bg-adtraxio-surface-elevated px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">You</p>
                      <p className="mt-1 text-sm text-foreground">
                        Why did my reach drop this week?
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-md border border-adtraxio-accent/20 bg-adtraxio-accent-muted px-3 py-2.5">
                      <p className="text-[11px] font-medium text-adtraxio-accent">
                        ADTRAXIO AI
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                        Your reach dropped 14%, but there&apos;s one important
                        signal.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Educational Reels generated 2.7× more engagement than
                        promotional content.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                        I&apos;d recommend publishing 3 educational Reels this
                        week.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <Button
                    size="sm"
                    className="bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
                  >
                    Create content plan
                  </Button>
                </div>
              </div>
            </div>
          </FadeContent>
        </div>
      </div>
    </section>
  );
}
