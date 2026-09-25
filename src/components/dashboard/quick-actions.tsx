"use client";

import Link from "next/link";
import {
  Bot,
  CalendarDays,
  Link2,
  Megaphone,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import {
  DashboardSection,
  DashboardSectionHeader,
} from "@/components/dashboard/dashboard-panel";
import { buildAssistantHref } from "@/components/assistant/ask-adtraxio-link";

const ACTIONS: {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Ask ADTRAXIO AI",
    description: "Analyze, create, and plan",
    href: buildAssistantHref({
      prompt:
        "What should I focus on this week? Use my performance and recommendations.",
      send: true,
    }),
    icon: Bot,
  },
  {
    label: "Create content",
    description: "Write a post or ad",
    href: "/create",
    icon: PenLine,
  },
  {
    label: "Create campaign",
    description: "Launch paid growth",
    href: "/campaigns",
    icon: Megaphone,
  },
  {
    label: "Schedule content",
    description: "Plan your calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Connect account",
    description: "Link social platforms",
    href: "/social",
    icon: Link2,
  },
];

export function QuickActions() {
  return (
    <DashboardSection>
      <DashboardSectionHeader title="Quick Actions" />

      <div className="mt-5 divide-y divide-border/60">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 py-3.5 transition-colors first:pt-0 last:pb-0 hover:text-foreground"
            >
              <Icon
                className="size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardSection>
  );
}
