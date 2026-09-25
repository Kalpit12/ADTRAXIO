"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function AttachmentPreview({
  attachments,
  onRemove,
  disabled,
}: AttachmentPreviewProps) {
  if (!attachments.length) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2 px-1">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            "group relative overflow-hidden rounded-lg border border-border/60 bg-background/60",
            isImage(attachment.file) ? "h-16 w-16" : "flex max-w-[200px] items-center gap-2 px-2 py-1.5"
          )}
        >
          {isImage(attachment.file) && attachment.previewUrl ? (
            <img
              src={attachment.previewUrl}
              alt={attachment.file.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-xs">{attachment.file.name}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {formatSize(attachment.file.size)}
                </p>
              </div>
            </>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            disabled={disabled}
            onClick={() => onRemove(attachment.id)}
            className="absolute right-0.5 top-0.5 size-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Remove ${attachment.file.name}`}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
