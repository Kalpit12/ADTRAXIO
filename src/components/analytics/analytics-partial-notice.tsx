interface AnalyticsPartialNoticeProps {
  unavailableMetrics: string[];
}

export function AnalyticsPartialNotice({
  unavailableMetrics,
}: AnalyticsPartialNoticeProps) {
  if (unavailableMetrics.length === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      <span className="text-foreground/90">Partial data.</span>{" "}
      {unavailableMetrics.join(", ")} unavailable for this period or platform.
      Missing values are shown as unavailable, not zero.
    </p>
  );
}
