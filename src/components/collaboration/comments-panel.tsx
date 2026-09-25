"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CollaborationComment } from "@/lib/collaboration/types";

const fieldClass =
  "flex min-h-[72px] w-full rounded-md border border-border/70 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-adtraxio-accent/50";

interface CommentsPanelProps {
  contentId?: string;
  campaignId?: string;
  approvalId?: string;
}

export function CommentsPanel({ contentId, campaignId, approvalId }: CommentsPanelProps) {
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
        setError(payload.error ?? "Unable to load comments.");
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
        setError(payload.error ?? "Unable to post comment.");
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
    <section className="space-y-4 rounded-lg border border-border/70 p-4">
      <h3 className="text-sm font-medium text-foreground">Feedback</h3>

      {loading && <p className="text-xs text-muted-foreground">Loading comments…</p>}

      {!loading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      )}

      <ul className="space-y-3">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="rounded-md border border-border/50 bg-secondary/10 px-3 py-2"
          >
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className={fieldClass}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add feedback…"
          rows={3}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
          {submitting ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </section>
  );
}
