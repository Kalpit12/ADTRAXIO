"use client";

import { MessageSquarePlus } from "lucide-react";
import { ConversationItem } from "@/components/assistant/conversation-item";
import { CopilotSidebarEmpty } from "@/components/copilot/copilot-empty-state";
import { groupConversations } from "@/components/assistant/utils";
import { Button } from "@/components/ui/button";
import type { ConversationRecord } from "@/lib/assistant/types";

interface ConversationSidebarProps {
  conversations: ConversationRecord[];
  activeId: string | null;
  loading?: boolean;
  fullWidth?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  fullWidth,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  const groups = groupConversations(conversations);

  return (
    <aside
      className={`flex h-full min-w-0 shrink-0 flex-col border-r border-border/60 bg-adtraxio-surface/20 ${
        fullWidth ? "w-full" : "w-[280px]"
      }`}
    >
      <div className="shrink-0 border-b border-border/60 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNew}
        >
          <MessageSquarePlus className="size-4" />
          New conversation
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-md bg-secondary/30"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <CopilotSidebarEmpty />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <ConversationItem
                        conversation={conversation}
                        active={activeId === conversation.id}
                        onSelect={() => onSelect(conversation.id)}
                        onDelete={() => onDelete(conversation.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
