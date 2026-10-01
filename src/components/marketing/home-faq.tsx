"use client";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

const faqs = [
  {
    q: "What platforms does ADTRAXIO support?",
    a: "Connect Instagram and Facebook through Meta today, with a unified social layer in the product for managing accounts, publishing, and performance in one place.",
  },
  {
    q: "Is ADTRAXIO only for enterprises?",
    a: "No. Free and Pro plans support individual creators and small teams. Agency is designed for multi-client operators who need workspaces, collaboration, and reporting.",
  },
  {
    q: "How does Growth Copilot differ from a chatbot?",
    a: "It is wired into your workspace — campaigns, content, analytics, experiments, and recommendations — with actions, evidence, and approvals instead of generic replies.",
  },
  {
    q: "Where is billing handled?",
    a: "Subscriptions are processed securely through Stripe. Plans and limits in the app match what you see on this page.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. Start on the Free plan with core creation, campaigns, and analytics. Upgrade when you need more accounts, intelligence, or team capacity.",
  },
];

export function HomeFaq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="marketing-container max-w-3xl">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="Straight answers before you commit."
            align="center"
          />
        </Reveal>

        <dl className="mt-12 space-y-8">
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <div className="border-t border-border/80 pt-6">
                <dt className="text-base font-medium text-foreground">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
