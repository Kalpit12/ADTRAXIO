"use client";

import { cn } from "@/lib/utils";

export type CampaignStatusFilter =
  | "all"
  | "active"
  | "draft"
  | "completed"
  | "paused"
  | "archived";

export type CampaignSort = "newest" | "oldest" | "name" | "status";

const STATUS_FILTERS: { value: CampaignStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS: { value: CampaignSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

interface CampaignFiltersProps {
  status: CampaignStatusFilter;
  sort: CampaignSort;
  onStatusChange: (status: CampaignStatusFilter) => void;
  onSortChange: (sort: CampaignSort) => void;
}

export function CampaignFilters({
  status,
  sort,
  onStatusChange,
  onSortChange,
}: CampaignFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onStatusChange(filter.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              status === filter.value
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Sort
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CampaignSort)}
          className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-adtraxio-accent/40"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
