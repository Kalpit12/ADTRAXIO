"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatToolStatus } from "@/components/assistant/utils";

interface ToolActivityProps {
  statuses: string[];
}

export function ToolActivity({ statuses }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(false);
  if (statuses.length === 0) return null;

  const latest = formatToolStatus(statuses[statuses.length - 1]);

  return (
    <div className="mb-3 max-w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
        <span className="truncate">{latest}</span>
      </button>
      {expanded && statuses.length > 1 && (
        <ul className="mt-1.5 space-y-1 border-l border-border/50 pl-4">
          {statuses.map((status, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {formatToolStatus(status)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
