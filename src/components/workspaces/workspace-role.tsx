import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/workspaces/display";
import type { ClientRole } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

interface WorkspaceRoleProps {
  role: ClientRole | string;
  showDescription?: boolean;
  className?: string;
}

export function WorkspaceRole({
  role,
  showDescription = false,
  className,
}: WorkspaceRoleProps) {
  const key = role as ClientRole;
  const label = ROLE_LABELS[key] ?? role;
  const description = ROLE_DESCRIPTIONS[key];

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className="inline-flex w-fit rounded border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground"
      >
        {label}
      </span>
      {showDescription && description && (
        <span className="max-w-xs text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      )}
    </span>
  );
}
