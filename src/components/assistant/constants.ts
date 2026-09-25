import {
  BarChart3,
  CalendarClock,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type CopilotQuickAction = {
  id: "create" | "analyze" | "plan" | "act";
  label: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};

export const COPILOT_QUICK_ACTIONS: CopilotQuickAction[] = [
  {
    id: "create",
    label: "Create content",
    description: "Drafts grounded in what’s working",
    prompt:
      "Help me create content based on my current performance. Use my top-performing content as reference.",
    icon: PenLine,
  },
  {
    id: "analyze",
    label: "Analyze performance",
    description: "Changes vs the prior period",
    prompt:
      "Analyze my recent performance and tell me what changed. Use real analytics only.",
    icon: BarChart3,
  },
  {
    id: "plan",
    label: "Plan my content",
    description: "Strategy from your strongest content",
    prompt:
      "Build a content plan based on my strongest content and current recommendations.",
    icon: Sparkles,
  },
  {
    id: "act",
    label: "Manage publishing",
    description: "Scheduled posts and attention items",
    prompt:
      "Show me what is scheduled and what needs attention in publishing.",
    icon: CalendarClock,
  },
];
