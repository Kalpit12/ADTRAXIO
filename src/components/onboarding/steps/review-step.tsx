"use client";

import {
  ACCOUNT_TYPE_LABELS,
  GOAL_LABELS,
  PLATFORM_LABELS,
} from "@/lib/onboarding/constants";
import type { OnboardingData } from "@/lib/onboarding/types";

interface ReviewStepProps {
  data: OnboardingData;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="border-b border-border/60 py-4 last:border-b-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ReviewStep({ data }: ReviewStepProps) {
  const accountLabel = data.accountType
    ? ACCOUNT_TYPE_LABELS[data.accountType]
    : "";

  const primaryGoals = data.goals
    .map((g) => GOAL_LABELS[g])
    .join(" · ");

  const platforms = data.platforms
    .map((p) => PLATFORM_LABELS[p])
    .join(" · ");

  const profileDetails = [
    data.profileName,
    data.location,
    data.website,
    data.description,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl tracking-tight text-foreground">
          Your ADTRAXIO workspace is ready.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review your setup before entering ADTRAXIO.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background/30 px-4">
        <SummaryRow label="Account" value={accountLabel} />
        <SummaryRow label="Primary goals" value={primaryGoals} />
        {data.accountType === "business" && (
          <SummaryRow label="Industry" value={data.industry} />
        )}
        {data.accountType === "creator" && (
          <SummaryRow label="Category" value={data.category} />
        )}
        {data.accountType === "agency" && (
          <>
            <SummaryRow label="Clients" value={data.clientCount} />
            <SummaryRow label="Industries served" value={data.industriesServed} />
          </>
        )}
        <SummaryRow
          label={data.accountType === "agency" ? "Agency" : "Profile"}
          value={profileDetails}
        />
        <SummaryRow label="Platforms" value={platforms} />
      </div>
    </div>
  );
}
