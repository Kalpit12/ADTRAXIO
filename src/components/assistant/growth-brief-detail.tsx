"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildAssistantHref } from "@/components/assistant/ask-adtraxio-link";
import { PrepareExecutionButton } from "@/components/assistant/prepare-execution-button";
import { Button } from "@/components/ui/button";
import { recommendationSupportsPrepare } from "@/lib/execution/plan-builder";
import type { GrowthBriefRecord } from "@/lib/agent/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-adtraxio-surface/25 p-5">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function GrowthBriefDetail({ brief }: { brief: GrowthBriefRecord }) {
  const working = brief.insights.filter(
    (i) =>
      i.type === "content_pattern" ||
      i.type === "performance_change" ||
      i.type === "growth_opportunity"
  );
  const attention = brief.insights.filter(
    (i) =>
      i.type === "publishing_issue" ||
      i.type === "consistency_issue" ||
      i.severity === "attention" ||
      i.severity === "important"
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] space-y-6 px-4 py-6">
        <Link
          href="/assistant/briefs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All briefs
        </Link>

        <header>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {brief.briefType} growth brief
          </p>
          <h1 className="mt-1 font-heading text-2xl tracking-tight">
            Growth brief
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {brief.summary}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {brief.metrics.periodLabel} · Generated{" "}
            {new Date(brief.generatedAt).toLocaleString()}
          </p>
        </header>

        {working.length > 0 && (
          <Section title="What's working">
            <ul className="space-y-3 text-sm">
              {working.map((item, idx) => (
                <li key={idx}>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-muted-foreground">{item.observation}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {attention.length > 0 && (
          <Section title="Needs attention">
            <ul className="space-y-3 text-sm">
              {attention.map((item, idx) => (
                <li key={idx}>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-muted-foreground">{item.observation}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {brief.insights.length > 0 && (
          <Section title="What changed">
            <ul className="space-y-3 text-sm">
              {brief.insights.map((item, idx) => (
                <li key={idx} className="border-t border-border/40 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-muted-foreground">{item.observation}</p>
                  {item.evidence.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {item.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {brief.recommendations.length > 0 && (
          <Section title="Recommended actions">
            <ul className="space-y-4">
              {brief.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">
                  <p className="font-medium text-foreground">{rec.title}</p>
                  <p className="mt-1 text-muted-foreground">{rec.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {recommendationSupportsPrepare(rec) && (
                      <PrepareExecutionButton
                        objective={rec.title}
                        growthBriefId={brief.id}
                        recommendationIndex={idx}
                      />
                    )}
                    <Button asChild size="sm" variant="secondary">
                      <Link
                        href={buildAssistantHref({
                          prompt:
                            rec.assistantPrompt ??
                            `Act on growth brief recommendation: ${rec.title}`,
                          send: true,
                        })}
                      >
                        Create
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Metrics">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {brief.metrics.engagementChangePercent != null && (
              <>
                <dt className="text-muted-foreground">Engagement change</dt>
                <dd className="tabular-nums">
                  {brief.metrics.engagementChangePercent > 0 ? "+" : ""}
                  {brief.metrics.engagementChangePercent}%
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Failed posts</dt>
            <dd>{brief.metrics.failedPostsCount}</dd>
            <dt className="text-muted-foreground">Scheduled (next 7d)</dt>
            <dd>{brief.metrics.scheduledPostsCount}</dd>
          </dl>
        </Section>
      </div>
    </div>
  );
}
