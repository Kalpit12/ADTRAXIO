"use client";

import { ConversationSidebar } from "@/components/assistant/conversation-sidebar";
import { AssistantHeader } from "@/components/assistant/assistant-header";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ConversationRecord } from "@/lib/assistant/types";

interface AssistantShellProps {
  children: React.ReactNode;
  conversations: ConversationRecord[];
  activeId: string | null;
  loadingConversations?: boolean;
  workspaceLabel: string | null;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function AssistantShell({
  children,
  conversations,
  activeId,
  loadingConversations,
  workspaceLabel,
  sidebarOpen,
  onSidebarOpenChange,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: AssistantShellProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <AssistantHeader
        workspaceLabel={workspaceLabel}
        onNewConversation={onNewConversation}
        onToggleSidebar={() => onSidebarOpenChange(true)}
        showSidebarToggle
      />

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="hidden min-h-0 shrink-0 lg:flex">
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            loading={loadingConversations}
            onSelect={onSelectConversation}
            onNew={onNewConversation}
            onDelete={onDeleteConversation}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
        <SheetContent side="left" className="w-[min(100vw,300px)] p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            loading={loadingConversations}
            fullWidth
            onSelect={(id) => {
              onSelectConversation(id);
              onSidebarOpenChange(false);
            }}
            onNew={() => {
              onNewConversation();
              onSidebarOpenChange(false);
            }}
            onDelete={onDeleteConversation}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
