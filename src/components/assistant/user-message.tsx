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
      <div className="max-w-[70%] min-w-0 rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 sm:max-w-[70%] max-[390px]:max-w-[85%]">
        {hasAttachments && (
          <MessageAttachments
            attachments={attachments!}
            className={hasContent ? "mb-2" : undefined}
          />
        )}
        {hasContent && (
          <p className="break-words text-sm leading-relaxed text-foreground">
            {content}
          </p>
        )}
      </div>
    </div>
  );
}
