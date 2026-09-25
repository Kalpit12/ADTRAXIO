"use client";

import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
import { buildAssistantHref } from "@/components/assistant/ask-adtraxio-link";
import { COPILOT_QUICK_ACTIONS } from "@/components/assistant/constants";
import {
  DashboardSection,
  DashboardSectionHeader,
} from "@/components/dashboard/dashboard-panel";

const PROMPTS = [
  {
    label: COPILOT_QUICK_ACTIONS[1].label,
    href: buildAssistantHref({
      prompt: COPILOT_QUICK_ACTIONS[1].prompt,
      send: true,
    }),
  },
  {
    label: COPILOT_QUICK_ACTIONS[0].label,
    href: buildAssistantHref({
      prompt: COPILOT_QUICK_ACTIONS[0].prompt,
      send: true,
    }),
  },
  {
    label: "What's next?",
    href: buildAssistantHref({
      prompt: COPILOT_QUICK_ACTIONS[2].prompt,
      send: true,
    }),
  },
];

export function AssistantLauncher() {
  return (
    <DashboardSection>
      <DashboardSectionHeader
        title="Ask ADTRAXIO AI"
        description="Your AI growth copilot for performance, content, and strategy."
        action={
          <Link
            href="/assistant"
            className="text-xs font-medium text-adtraxio-accent hover:underline"
          >
            Open assistant
          </Link>
        }
      />

      <Link
        href="/assistant"
        className="mt-4 flex items-center gap-3 rounded-lg border border-border/70 bg-adtraxio-surface-elevated/50 p-4 transition-colors hover:border-adtraxio-accent/30"
      >
        <Bot className="size-5 shrink-0 text-adtraxio-accent" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Ask anything about your workspace
          </p>
          <p className="text-xs text-muted-foreground">
            Analytics, content, campaigns, publishing, and recommendations.
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <Link
            key={prompt.label}
            href={prompt.href}
            className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-adtraxio-accent/40 hover:text-foreground"
          >
            {prompt.label}
          </Link>
        ))}
      </div>
    </DashboardSection>
  );
}
