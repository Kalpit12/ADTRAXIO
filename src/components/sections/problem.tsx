"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { SectionImage } from "@/components/ui/section-image";
import { ArrowRight } from "lucide-react";
import { homepageImages } from "@/lib/images";

const tools = [
  "Ideas",
  "Content",
  "Scheduling",
  "Campaigns",
  "Analytics",
  "Strategy",
];

export function Problem() {
  const image = homepageImages.agencyTeamMeeting;

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading max-w-2xl text-3xl tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            Your growth shouldn&apos;t live in five different tools.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal delay={0.1}>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool, i) => (
                <motion.span
                  key={tool}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-md border border-border bg-adtraxio-surface px-4 py-2.5 text-sm text-muted-foreground"
                >
                  {tool}
                </motion.span>
              ))}
            </div>
            <SectionImage
              src={image.src}
              alt={image.alt}
              credit={image.credit}
              overlay="bottom"
              className="mt-8 aspect-[16/9] w-full"
            />
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex items-center gap-4">
              <ArrowRight className="hidden size-5 shrink-0 text-adtraxio-accent lg:block" />
              <div className="rounded-lg border border-adtraxio-accent/30 bg-adtraxio-accent-muted p-8 glow-accent-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-adtraxio-accent">
                  The ADTRAXIO way
                </p>
                <p className="font-heading mt-3 text-2xl tracking-tight text-foreground sm:text-3xl">
                  One intelligent workspace.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Everything connected. AI that knows your content, campaigns,
                  and performance — and tells you what to do next.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
