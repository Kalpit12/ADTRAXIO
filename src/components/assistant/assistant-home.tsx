"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildAssistantHref } from "@/components/assistant/ask-adtraxio-link";
import { CopilotLoopActions } from "@/components/copilot/copilot-loop-actions";
import { CopilotSection } from "@/components/copilot/copilot-section";
import type { AssistantHomePayload } from "@/lib/assistant/home-types";
import { cn } from "@/lib/utils";

interface AssistantHomeProps {
  workspaceLabel: string | null;
  onSelectPrompt: (prompt: string) => void;
}

function formatMetric(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatChange(change: number | null): string | null {
  if (change == null) return null;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change}%`;
}

export function AssistantHome({
  workspaceLabel,
  onSelectPrompt,
}: AssistantHomeProps) {
  const [home, setHome] = useState<AssistantHomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/assistant/home")
      .then(async (res) => {
        const payload = (await res.json()) as {
          home?: AssistantHomePayload;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(payload.error ?? "Unable to load workspace context.");
          return;
        }
        setHome(payload.home ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load workspace context.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = home?.workspaceLabel ?? workspaceLabel;

  return (
    <div className="flex w-full max-w-[820px] flex-col gap-8 py-2 sm:py-4">
      <header className="space-y-2 border-b border-border/50 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
          Growth Copilot
        </p>
        <h2 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
          Your growth workspace, in context
        </h2>
        {label && (
          <p className="text-xs text-muted-foreground">
            Workspace · <span className="text-foreground/85">{label}</span>
          </p>
        )}
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Create, analyze, plan, act, and learn — with evidence from your
          connected channels.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-md bg-secondary/25" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-md border border-border/40 bg-secondary/15"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : home?.needsClientSelection ? (
        <CopilotSection eyebrow="Context" title="Select a client workspace">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a client workspace to see performance, content, and
            recommendations for that account.
          </p>
        </CopilotSection>
      ) : (
        <>
          <CopilotSection eyebrow="What matters now" title="Current state">
            {home?.growthBrief ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground/90">
                  {home.growthBrief.summary}
                </p>
                {home.growthBrief.highlightLines.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {home.growthBrief.highlightLines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-adtraxio-accent" aria-hidden>
                          —
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {home.growthBrief.nextActionTitle && (
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Suggested next step
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {home.growthBrief.nextActionTitle}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium">
                      {home.growthBrief.nextActionPrompt && (
                        <Link
                          href={buildAssistantHref({
                            prompt: home.growthBrief.nextActionPrompt,
                            send: true,
                          })}
                          className="text-adtraxio-accent hover:underline"
                        >
                          Act on this
                        </Link>
                      )}
                      <Link
                        href={`/assistant/briefs/${home.growthBrief.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Open growth brief
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : home?.hasInsights ? (
              <p className="text-sm text-muted-foreground">
                Signals from your workspace are summarized below.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Connect platforms and sync analytics to populate context. You
                can still run create, plan, and publishing workflows from the
                actions below.
              </p>
            )}
          </CopilotSection>

          {home?.hasInsights && (
            <div className="grid gap-6 lg:grid-cols-3">
              {home.performance.length > 0 && (
                <CopilotSection
                  variant="inset"
                  eyebrow="Analyze"
                  title="Performance"
                >
                  <p className="mb-3 text-xs text-muted-foreground">
                    {home.periodLabel}
                  </p>
                  <div className="space-y-3">
                    {home.performance.map((metric) => {
                      const change = formatChange(metric.changePercent);
                      const up = (metric.changePercent ?? 0) > 0;
                      const down = (metric.changePercent ?? 0) < 0;
                      return (
                        <div key={metric.key} className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {metric.label}
                          </p>
                          <p className="font-heading text-xl tabular-nums text-foreground">
                            {formatMetric(metric.value)}
                          </p>
                          {change && (
                            <p
                              className={cn(
                                "text-xs tabular-nums",
                                up && "text-adtraxio-accent",
                                down && "text-red-400/80",
                                !up && !down && "text-muted-foreground"
                              )}
                            >
                              {change} vs prior period
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CopilotSection>
              )}

              {home.topContent.length > 0 && (
                <CopilotSection
                  variant="inset"
                  eyebrow="Learn"
                  title="What's working"
                >
                  <ul className="space-y-3">
                    {home.topContent.map((item) => (
                      <li
                        key={item.id}
                        className="border-t border-border/40 pt-3 first:border-0 first:pt-0"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.platform}
                          {item.accountName ? ` · ${item.accountName}` : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                          {item.caption?.trim() || "Published post"}
                        </p>
                        {item.engagement != null && (
                          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            {item.engagement.toLocaleString()} engagement
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </CopilotSection>
              )}

              {(home.nextAction || home.publishing) && (
                <CopilotSection
                  variant="inset"
                  eyebrow="Act"
                  title="Needs attention"
                >
                  {home.nextAction ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {home.nextAction.title}
                      </p>
                      {home.nextAction.observation && (
                        <p className="text-sm text-muted-foreground">
                          {home.nextAction.observation}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPrompt(
                            `Explain this recommendation and what I should do next: "${home.nextAction!.title}"`
                          )
                        }
                        className="text-xs font-medium text-adtraxio-accent hover:underline"
                      >
                        Discuss in conversation
                      </button>
                    </div>
                  ) : home.publishing ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {home.publishing.scheduledCount > 0 && (
                        <p>
                          {home.publishing.scheduledCount} scheduled post
                          {home.publishing.scheduledCount === 1 ? "" : "s"}
                        </p>
                      )}
                      {home.publishing.needsAttentionCount > 0 && (
                        <p className="text-foreground/90">
                          {home.publishing.needsAttentionCount} failed — review
                          publishing
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPrompt(
                            "Show me what is scheduled and what needs attention in publishing."
                          )
                        }
                        className="text-xs font-medium text-adtraxio-accent hover:underline"
                      >
                        Open publishing review
                      </button>
                    </div>
                  ) : null}
                </CopilotSection>
              )}
            </div>
          )}
        </>
      )}

      <CopilotSection eyebrow="Workflows" title="What do you want to do?">
        <CopilotLoopActions onSelect={onSelectPrompt} />
      </CopilotSection>

      <div className="flex flex-wrap gap-4 border-t border-border/50 pt-6 text-xs text-muted-foreground">
        <Link href="/assistant/briefs" className="hover:text-foreground">
          Growth briefs
        </Link>
        <Link href="/assistant/brand" className="hover:text-foreground">
          Brand Brain
        </Link>
        <Link href="/assistant/experiments" className="hover:text-foreground">
          Experiments
        </Link>
        <Link href="/analytics" className="hover:text-foreground">
          Analytics
        </Link>
      </div>
    </div>
  );
}
