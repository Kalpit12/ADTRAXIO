"use client";

import { AssistantLoading } from "@/components/assistant/assistant-loading";
import { AssistantMessage } from "@/components/assistant/assistant-message";
import { AssistantHome } from "@/components/assistant/assistant-home";
import { UserMessage } from "@/components/assistant/user-message";
import type { MessageRecord, PendingActionRecord } from "@/lib/assistant/types";

interface MessageListProps {
  messages: MessageRecord[];
  loading?: boolean;
  sending?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectPrompt: (prompt: string) => void;
  workspaceLabel?: string | null;
  pendingActions: Record<string, PendingActionRecord>;
  statusByMessage: Record<string, string[]>;
  confirmingId: string | null;
  onConfirmAction: (actionId: string, messageId: string) => void;
  onCancelAction: (actionId: string, messageId: string) => void;
  onFollowUp?: (prompt: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  loading,
  sending,
  error,
  onRetry,
  onSelectPrompt,
  workspaceLabel,
  pendingActions,
  statusByMessage,
  confirmingId,
  onConfirmAction,
  onCancelAction,
  onFollowUp,
  bottomRef,
}: MessageListProps) {
  const showEmpty = !loading && messages.length === 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col px-3 py-6 sm:px-4">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
          >
            <p className="text-sm text-red-200/90">
              {error.includes("limit") || error.startsWith("Unable")
                ? error
                : "Something went wrong while processing that request."}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-8">
            <AssistantLoading />
            <AssistantLoading />
          </div>
        ) : showEmpty ? (
          <AssistantHome
            workspaceLabel={workspaceLabel ?? null}
            onSelectPrompt={onSelectPrompt}
          />
        ) : (
          <div className="space-y-8">
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <UserMessage
                    key={message.id}
                    content={message.content}
                    attachments={message.attachments}
                  />
                );
              }
              if (message.role !== "assistant") return null;
              const pending = pendingActions[message.id];
              return (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  pendingAction={pending}
                  confirming={confirmingId === pending?.id}
                  statusUpdates={statusByMessage[message.id]}
                  onConfirmAction={
                    pending
                      ? () => onConfirmAction(pending.id, message.id)
                      : undefined
                  }
                  onCancelAction={
                    pending
                      ? () => onCancelAction(pending.id, message.id)
                      : undefined
                  }
                  onFollowUp={onFollowUp}
                />
              );
            })}
            {sending && <AssistantLoading />}
            <div ref={bottomRef} className="h-1 shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
