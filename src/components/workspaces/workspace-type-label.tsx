import { cn } from "@/lib/utils";

interface WorkspaceTypeLabelProps {
  type: "agency" | "client" | "standard";
  className?: string;
}

const COPY: Record<WorkspaceTypeLabelProps["type"], string> = {
  agency: "Agency workspace",
  client: "Client workspace",
  standard: "Workspace",
};

export function WorkspaceTypeLabel({ type, className }: WorkspaceTypeLabelProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        className
      )}
    >
      {COPY[type]}
    </span>
  );
}
