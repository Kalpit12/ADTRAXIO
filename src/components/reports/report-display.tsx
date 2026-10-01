"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { ReportExecutiveSummary } from "@/components/reports/report-executive-summary";
import { ReportSnapshotHeader } from "@/components/reports/report-snapshot-header";
import {
  formatReportDate,
  formatReportMetric,
  formatReportPercent,
  formatReportRate,
} from "@/components/reports/format";
import type { ReportSnapshotData } from "@/lib/reporting/types";
import { cn } from "@/lib/utils";

function Section({
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
      className={cn("break-inside-avoid space-y-4 print:break-inside-avoid", className)}
    >
      <h2 className="font-heading text-xl tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-border/60 bg-adtraxio-surface/10 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ReportDisplay({
  snapshot,
  showActions = false,
  actions,
}: {
  snapshot: ReportSnapshotData;
  showActions?: boolean;
  actions?: React.ReactNode;
}) {
  const { overview, growth, platforms, content, campaigns, recommendations, aiSummary } =
    snapshot;

  return (
    <article className="report-document mx-auto max-w-5xl space-y-10">
      {showActions && actions && (
        <div className="no-print flex items-center justify-end gap-2">{actions}</div>
      )}

      <ReportSnapshotHeader snapshot={snapshot} />

      {aiSummary && <ReportExecutiveSummary aiSummary={aiSummary} />}

      <Section title="Performance overview">
        {!overview.hasData ? (
          <p className="text-sm text-muted-foreground">
            No analytics data available for this period.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Impressions" value={formatReportMetric(overview.impressions)} />
            <MetricTile label="Reach" value={formatReportMetric(overview.reach)} />
            <MetricTile label="Engagement" value={formatReportMetric(overview.engagement)} />
            <MetricTile
              label="Engagement rate"
              value={formatReportRate(overview.engagementRate)}
            />
            <MetricTile label="Followers" value={formatReportMetric(overview.followers)} />
            <MetricTile
              label="Published content"
              value={formatReportMetric(overview.publishedContent)}
            />
            <MetricTile
              label="Active campaigns"
              value={formatReportMetric(overview.activeCampaigns)}
            />
            <MetricTile
              label="Completed campaigns"
              value={formatReportMetric(overview.completedCampaigns)}
            />
          </div>
        )}
      </Section>

      {snapshot.config.includePlatforms && platforms.length > 0 && (
        <Section title="Platform performance">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/20 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Impressions</th>
                  <th className="px-4 py-3 font-medium">Reach</th>
                  <th className="px-4 py-3 font-medium">Engagement</th>
                  <th className="px-4 py-3 font-medium">Followers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {platforms.map((row) => (
                  <tr key={row.platform}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 capitalize">
                        <PlatformIcon platform={row.platform} className="size-4" />
                        {row.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(row.impressions)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(row.reach)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(row.engagement)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(row.followers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {snapshot.config.includeContent && content.length > 0 && (
        <Section title="Content performance">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/20 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Content</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Engagement</th>
                  <th className="px-4 py-3 font-medium">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {content.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 max-w-xs text-foreground">
                        {item.caption ?? "Untitled post"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatReportDate(item.publishedAt?.slice(0, 10) ?? null)}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {item.platform}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(item.engagement)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(item.reach)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {snapshot.config.includeCampaigns && campaigns.length > 0 && (
        <Section title="Campaign performance">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/20 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Content</th>
                  <th className="px-4 py-3 font-medium">Engagement</th>
                  <th className="px-4 py-3 font-medium">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      {campaign.objective && (
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                          {campaign.objective.replace(/_/g, " ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {campaign.status}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {campaign.contentCount}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(campaign.engagement)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatReportMetric(campaign.reach)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {growth.length > 0 && (
        <Section title="Growth">
          <div className="grid gap-3 sm:grid-cols-3">
            {growth.map((item) => (
              <MetricTile
                key={item.key}
                label={item.label}
                value={formatReportMetric(item.current)}
                sub={`vs prior period: ${formatReportPercent(item.changePercent)}`}
              />
            ))}
          </div>
        </Section>
      )}

      {recommendations.length > 0 && (
        <Section title="Recommendations">
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-lg border border-border/60 bg-secondary/10 px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                {rec.observation && (
                  <p className="mt-1 text-sm text-muted-foreground">{rec.observation}</p>
                )}
                {rec.recommendation && (
                  <p className="mt-2 text-sm text-foreground">{rec.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {aiSummary && (aiSummary.notableChanges.length > 0 || aiSummary.recommendedActions.length > 0) && (
        <Section title="Next steps">
          {aiSummary.notableChanges.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notable changes
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {aiSummary.notableChanges.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {aiSummary.recommendedActions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recommended actions
              </p>
              <ul className="space-y-1 text-sm text-foreground">
                {aiSummary.recommendedActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </article>
  );
}
