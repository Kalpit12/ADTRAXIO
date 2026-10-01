import Link from "next/link";
import { COPILOT_LOOP_ACTIONS } from "@/components/assistant/constants";

export function CopilotSidebarEmpty() {
  return (
    <div className="px-3 py-6">
      <p className="text-sm font-medium text-foreground">Growth Copilot</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Start a workflow — create, analyze, plan, act, or learn — from the home
        view or type below.
      </p>
      <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
        {COPILOT_LOOP_ACTIONS.slice(0, 3).map((a) => (
          <li key={a.id}>
            <span className="text-foreground/80">{a.loop}</span> — {a.label}
          </li>
        ))}
      </ul>
      <Link
        href="/assistant/learnings"
        className="mt-4 inline-block text-xs font-medium text-adtraxio-accent hover:underline"
      >
        Review learnings
      </Link>
    </div>
  );
}
