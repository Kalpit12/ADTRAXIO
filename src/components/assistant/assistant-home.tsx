"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdtraxioAiMark } from "@/components/assistant/adtraxio-ai-mark";
import { buildAssistantHref } from "@/components/assistant/ask-adtraxio-link";
import { COPILOT_QUICK_ACTIONS } from "@/components/assistant/constants";
import type { AssistantHomePayload } from "@/lib/assistant/home-types";
import { cn } from "@/lib/utils";

interface AssistantHomeProps {
  workspaceLabel: string | null;
  onSelectPrompt: (prompt: string) => void;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
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

function InsightSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-adtraxio-surface/25 p-4 sm:p-5",
        className
      )}
    >
      <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
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
          setError(payload.error ?? "Unable to load workspace insights.");
          return;
        }
        setHome(payload.home ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load workspace insights.");
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
    <div className="flex w-full max-w-[820px] flex-col gap-8 py-4 sm:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <AdtraxioAiMark size="sm" />
          <div>
            <h2 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
              ADTRAXIO AI
            </h2>
            <p className="text-sm text-muted-foreground">Your growth copilot</p>
          </div>
        </div>
        {label && (
          <p className="text-xs text-muted-foreground">
            Workspace · <span className="text-foreground/80">{label}</span>
          </p>
        )}
        <p className="font-heading text-xl tracking-tight text-foreground/95 sm:text-2xl">
          {timeGreeting()}
        </p>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what needs your attention.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border/40 bg-secondary/20"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : home?.needsClientSelection ? (
        <InsightSection title="Workspace">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Select a client workspace to see performance, content, and
            recommendations for that client.
          </p>
        </InsightSection>
      ) : home?.growthBrief ? (
        <InsightSection title="What's changed">
          <p className="text-sm leading-relaxed text-foreground/90">
            {home.growthBrief.summary}
          </p>
          {home.growthBrief.highlightLines.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {home.growthBrief.highlightLines.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          )}
          {home.growthBrief.nextActionTitle && (
            <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Next best action
              </p>
              <p className="text-sm font-medium text-foreground">
                {home.growthBrief.nextActionTitle}
              </p>
              <div className="flex flex-wrap gap-3">
                {home.growthBrief.nextActionPrompt && (
                  <Link
                    href={buildAssistantHref({
                      prompt: home.growthBrief.nextActionPrompt,
                      send: true,
                    })}
                    className="text-xs font-medium text-adtraxio-accent hover:underline"
                  >
                    Create
                  </Link>
                )}
                <Link
                  href={`/assistant/briefs/${home.growthBrief.id}`}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View analysis
                </Link>
              </div>
            </div>
          )}
        </InsightSection>
      ) : null}

      {home?.hasInsights ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {home.performance.length > 0 && (
            <InsightSection title="Performance" className="lg:col-span-1">
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
                      <p className="text-lg font-medium tabular-nums text-foreground">
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
            </InsightSection>
          )}

          {home.topContent.length > 0 && (
            <InsightSection title="What's working" className="lg:col-span-1">
              <ul className="space-y-3">
                {home.topContent.map((item) => (
                  <li key={item.id} className="min-w-0 border-t border-border/40 pt-3 first:border-0 first:pt-0">
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
            </InsightSection>
          )}

          {(home.nextAction || home.publishing) && (
            <InsightSection title="Next best action" className="lg:col-span-1">
              {home.nextAction ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {home.nextAction.title}
                  </p>
                  {home.nextAction.observation && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {home.nextAction.observation}
                    </p>
                  )}
                  {home.nextAction.recommendation && (
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {home.nextAction.recommendation}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectPrompt(
                        `Explain this recommendation and what I should do next: "${home.nextAction!.title}"`
                      )
                    }
                    className="mt-2 text-xs font-medium text-adtraxio-accent hover:underline"
                  >
                    Discuss with ADTRAXIO AI
                  </button>
                </div>
              ) : home.publishing ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {home.publishing.scheduledCount > 0 && (
                    <p>
                      {home.publishing.scheduledCount} post
                      {home.publishing.scheduledCount === 1 ? "" : "s"} scheduled
                    </p>
                  )}
                  {home.publishing.needsAttentionCount > 0 && (
                    <p className="text-red-400/90">
                      {home.publishing.needsAttentionCount} failed — needs
                      attention
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectPrompt(COPILOT_QUICK_ACTIONS[3].prompt)
                    }
                    className="text-xs font-medium text-adtraxio-accent hover:underline"
                  >
                    Review publishing
                  </button>
                </div>
              ) : null}
            </InsightSection>
          )}
        </div>
      ) : !home?.growthBrief ? (
        <InsightSection title="Getting started">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Connect platforms and sync analytics to see performance here. You can
            still create content, plan strategy, and manage publishing with ADTRAXIO
            AI.
          </p>
        </InsightSection>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">What do you want to do?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COPILOT_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onSelectPrompt(action.prompt)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border/60 bg-adtraxio-surface/30 p-4 text-left transition-colors",
                  "hover:border-adtraxio-accent/30 hover:bg-adtraxio-surface-elevated/40"
                )}
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0 text-adtraxio-accent"
                  strokeWidth={1.5}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
