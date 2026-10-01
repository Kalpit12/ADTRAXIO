"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { friendlyCollaborationError } from "@/lib/collaboration/display";
import type { CollaborationComment } from "@/lib/collaboration/types";

const fieldClass =
  "w-full rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40";

interface ApprovalCommentListProps {
  contentId?: string;
  campaignId?: string;
  approvalId?: string;
}

export function ApprovalCommentList({
  contentId,
  campaignId,
  approvalId,
}: ApprovalCommentListProps) {
  const [comments, setComments] = useState<CollaborationComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (contentId) params.set("contentId", contentId);
    if (campaignId) params.set("campaignId", campaignId);
    if (approvalId) params.set("approvalId", approvalId);

    try {
      const response = await fetch(`/api/collaboration/comments?${params.toString()}`);
      const payload = (await response.json()) as {
        comments?: CollaborationComment[];
        error?: string;
      };
      if (!response.ok) {
        setError(friendlyCollaborationError(payload.error));
        return;
      }
      setComments(payload.comments ?? []);
    } catch {
      setError("Unable to load comments.");
    } finally {
      setLoading(false);
    }
  }, [approvalId, campaignId, contentId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/collaboration/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, contentId, campaignId, approvalId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(friendlyCollaborationError(payload.error));
        return;
      }
      setBody("");
      await loadComments();
    } catch {
      setError("Unable to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Feedback
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Professional review notes — not a live chat.
        </p>
      </div>

      {loading && (
        <div className="h-16 animate-pulse rounded-md bg-secondary/20" aria-busy="true" />
      )}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      )}

      <ul className="space-y-4">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="border-b border-border/50 pb-4 last:border-0"
          >
            <p className="text-sm font-medium text-foreground">
              {comment.authorName ?? "Reviewer"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-border/50 pt-4">
        <label htmlFor="approval-comment" className="text-sm font-medium text-foreground">
          Add feedback
        </label>
        <textarea
          id="approval-comment"
          className={`${fieldClass} min-h-[88px]`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Explain what should change or what you approved…"
          rows={3}
        />
        {error && (
          <p role="alert" className="text-xs text-red-200/90">{error}</p>
        )}
        <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
          {submitting ? "Posting…" : "Post feedback"}
        </Button>
      </form>
    </div>
  );
}
