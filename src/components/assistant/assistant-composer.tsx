"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { AttachmentPreview, type PendingAttachment } from "@/components/assistant/attachment-preview";
import { Button } from "@/components/ui/button";
import { ASSISTANT_MAX_ATTACHMENTS } from "@/lib/assistant/attachment-constants";
import { cn } from "@/lib/utils";

interface AssistantComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (payload: { text: string; files: File[] }) => void;
  onStop?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AssistantComposer({
  value,
  onChange,
  onSend,
  onStop,
  loading,
  disabled,
}: AssistantComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const canSend =
    !loading && !disabled && (value.trim().length > 0 || attachments.length > 0);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend({
      text: value,
      files: attachments.map((a) => a.file),
    });
    attachments.forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setAttachments([]);
    setAttachmentError(null);
  }, [attachments, canSend, onSend, value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachmentError(null);

    const remaining = ASSISTANT_MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setAttachmentError(`You can attach up to ${ASSISTANT_MAX_ATTACHMENTS} files.`);
      return;
    }

    const nextFiles = Array.from(fileList).slice(0, remaining);
    const newAttachments: PendingAttachment[] = nextFiles.map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    if (fileList.length > remaining) {
      setAttachmentError(`Only ${ASSISTANT_MAX_ATTACHMENTS} files can be attached.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
    setAttachmentError(null);
  }

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto w-full max-w-[820px]">
        <p className="mb-2 hidden text-[10px] text-muted-foreground sm:block">
          Ask about performance, content, strategy, publishing, or experiments —
          grounded in your workspace data.
        </p>
        <div
          className={cn(
            "rounded-md border border-border/70 bg-adtraxio-surface/25 p-2.5 transition-colors sm:p-3",
            "focus-within:border-adtraxio-accent/35"
          )}
        >
          <AttachmentPreview
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            disabled={loading || disabled}
          />
          {attachmentError && (
            <p className="mb-2 px-1 text-xs text-red-400" role="alert">
              {attachmentError}
            </p>
          )}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Growth Copilot…"
            rows={2}
            disabled={disabled || loading}
            aria-label="Message Growth Copilot"
            className={cn(
              "w-full min-h-[48px] max-h-32 resize-none bg-transparent px-1 py-1 text-sm leading-relaxed",
              "placeholder:text-muted-foreground/50 focus:outline-none"
            )}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
                disabled={disabled || loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={
                  disabled ||
                  loading ||
                  attachments.length >= ASSISTANT_MAX_ATTACHMENTS
                }
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Attach files"
              >
                <Paperclip className="size-4" />
              </Button>
            </div>
            {loading ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={onStop}
                aria-label="Stop generation"
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
                className="bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
