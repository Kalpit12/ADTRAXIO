"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConversationRecord } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: ConversationRecord;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-md",
        active ? "bg-secondary/50" : "hover:bg-secondary/30"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[13px] text-foreground/85"
      >
        {conversation.title}
      </button>
      <div ref={menuRef} className="relative shrink-0 pr-1">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[open=true]:opacity-100"
          data-open={menuOpen}
          aria-label="Conversation actions"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-md border border-border/70 bg-popover py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary/40"
            >
              <Trash2 className="size-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
