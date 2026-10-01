import {
  BarChart3,
  CalendarClock,
  PenLine,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type CopilotQuickAction = {
  id: "create" | "analyze" | "plan" | "act" | "learn";
  loop: "Create" | "Analyze" | "Plan" | "Act" | "Learn";
  label: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};

export const COPILOT_LOOP_ACTIONS: CopilotQuickAction[] = [
  {
    id: "create",
    loop: "Create",
    label: "Create content",
    description: "Drafts grounded in what’s working",
    prompt:
      "Help me create content based on my current performance. Use my top-performing content as reference.",
    icon: PenLine,
  },
  {
    id: "analyze",
    loop: "Analyze",
    label: "Understand performance",
    description: "Changes vs the prior period",
    prompt:
      "Analyze my recent performance and tell me what changed. Use real analytics only.",
    icon: BarChart3,
  },
  {
    id: "plan",
    loop: "Plan",
    label: "Build a strategy",
    description: "Strategy from evidence and recommendations",
    prompt:
      "Build a content plan based on my strongest content and current recommendations.",
    icon: Sparkles,
  },
  {
    id: "act",
    loop: "Act",
    label: "Review planned actions",
    description: "Publishing queue and items needing attention",
    prompt:
      "Show me what is scheduled and what needs attention in publishing.",
    icon: CalendarClock,
  },
  {
    id: "learn",
    loop: "Learn",
    label: "Review what worked",
    description: "Outcomes, experiments, and learnings",
    prompt:
      "Summarize recent learning outcomes and experiment results using real data. What should we carry forward?",
    icon: TrendingUp,
  },
];

/** @deprecated use COPILOT_LOOP_ACTIONS */
export const COPILOT_QUICK_ACTIONS = COPILOT_LOOP_ACTIONS;
