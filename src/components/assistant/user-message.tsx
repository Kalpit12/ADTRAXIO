"use client";

import { MessageAttachments } from "@/components/assistant/message-attachments";
import type { MessageAttachment } from "@/lib/assistant/types";

interface UserMessageProps {
  content: string;
  attachments?: MessageAttachment[] | null;
}

export function UserMessage({ content, attachments }: UserMessageProps) {
  const hasContent = content.trim().length > 0;
  const hasAttachments = Boolean(attachments?.length);

  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[min(100%,36rem)] min-w-0 border-b border-border/50 pb-4 text-right">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          You
        </p>
        {hasAttachments && (
          <MessageAttachments
            attachments={attachments!}
            className={hasContent ? "mb-2 mt-2" : "mt-2"}
          />
        )}
        {hasContent && (
          <p className="mt-2 break-words text-sm leading-relaxed text-foreground">
            {content}
          </p>
        )}
      </div>
    </div>
  );
}
