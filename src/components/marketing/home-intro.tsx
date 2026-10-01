"use client";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { APP_NAME } from "@/lib/brand";

export function HomeIntro() {
  return (
    <section id="platform" className="border-y border-border/80 py-20 sm:py-28">
      <div className="marketing-container">
        <Reveal>
          <SectionHeading
            eyebrow={`What is ${APP_NAME}?`}
            title="One growth operating system for social teams."
            lead={`${APP_NAME} connects content, campaigns, publishing, analytics, and AI strategy in a single workspace — so you can create, measure, plan, execute, and learn without switching tools.`}
          />
        </Reveal>

        <Reveal delay={0.08}>
          <dl className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                term: "The problem",
                detail:
                  "Growth work is split across docs, schedulers, ad managers, and dashboards. Context gets lost between tools.",
              },
              {
                term: "The shift",
                detail:
                  "Your content, campaigns, performance data, and AI recommendations share one workspace and one source of truth.",
              },
              {
                term: "The outcome",
                detail:
                  "Clearer decisions, faster execution, and a team that always knows what to publish, measure, and improve next.",
              },
            ].map((item) => (
              <div key={item.term} className="border-t border-border/80 pt-5">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {item.term}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
