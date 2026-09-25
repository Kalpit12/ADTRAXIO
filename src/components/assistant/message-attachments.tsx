"use client";

import { FileText } from "lucide-react";
import type { MessageAttachment } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageAttachments({
  attachments,
  className,
}: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.type === "image");
  const files = attachments.filter((a) => a.type === "file");

  return (
    <div className={cn("space-y-2", className)}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-border/60"
            >
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-48 max-w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground hover:bg-background/80"
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="max-w-[160px] truncate">{attachment.name}</span>
              <span className="text-muted-foreground/60">
                {formatSize(attachment.size)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
