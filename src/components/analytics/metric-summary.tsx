interface MetricSummaryProps {
  impressions: number | null;
  reach: number | null;
  engagement: number | null;
  followers: number | null;
}

function formatValue(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function MetricSummary({
  impressions,
  reach,
  engagement,
  followers,
}: MetricSummaryProps) {
  const items = [
    { label: "Impressions", value: impressions },
    { label: "Reach", value: reach },
    { label: "Engagement", value: engagement },
    { label: "Followers", value: followers },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border/60 px-4 py-4"
        >
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {formatValue(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
