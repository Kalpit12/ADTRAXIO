export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "engagement",
  "leads",
  "sales",
  "traffic",
  "app_installs",
  "growth",
] as const;

export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "completed",
  "paused",
  "archived",
] as const;

export const CAMPAIGN_OBJECTIVE_LABELS: Record<
  (typeof CAMPAIGN_OBJECTIVES)[number],
  string
> = {
  awareness: "Awareness",
  engagement: "Engagement",
  leads: "Leads",
  sales: "Sales",
  traffic: "Traffic",
  app_installs: "App installs",
  growth: "Growth",
};

export const CAMPAIGN_STATUS_LABELS: Record<
  (typeof CAMPAIGN_STATUSES)[number],
  string
> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  archived: "Archived",
};
