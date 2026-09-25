"use client";

import { IntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { DashboardSection } from "@/components/dashboard/dashboard-panel";

interface AIInsightCardProps {
  hasData?: boolean;
}

export function AIInsightCard({ hasData = false }: AIInsightCardProps) {
  return (
    <DashboardSection>
      <IntelligencePanel
        title="Recommendations"
        compact
        maxItems={2}
        showInsights={false}
        viewAllHref="/intelligence"
      />
      {!hasData && (
        <p className="mt-2 text-xs text-muted-foreground">
          Connect accounts and publish content to unlock richer insights.
        </p>
      )}
    </DashboardSection>
  );
}
