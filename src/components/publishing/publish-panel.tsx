"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import { getDefaultTimezone } from "@/lib/publishing/timezone";
import type { PublishingMediaType } from "@/lib/publishing/types";
import type { SafeSocialAccount } from "@/lib/social/types";
import { cn } from "@/lib/utils";

interface PublishPanelProps {
  open: boolean;
  contentId?: string | null;
  caption: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

type TimingMode = "now" | "schedule";

export function PublishPanel({
  open,
  contentId,
  caption,
  onClose,
  onSuccess,
}: PublishPanelProps) {
  const [accounts, setAccounts] = useState<SafeSocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [timing, setTiming] = useState<TimingMode>("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone());
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<PublishingMediaType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.status === "connected" &&
          (account.platform === "facebook" || account.platform === "instagram")
      ),
    [accounts]
  );

  const selectedAccount = publishableAccounts.find(
    (account) => account.id === selectedAccountId
  );

  useEffect(() => {
    if (!open) return;

    setLoadingAccounts(true);
    setError(null);

    fetch("/api/social/accounts")
      .then((res) => res.json())
      .then((data: { accounts?: SafeSocialAccount[] }) => {
        const list = data.accounts ?? [];
        setAccounts(list);
        const first = list.find(
          (account) =>
            account.status === "connected" &&
            (account.platform === "facebook" || account.platform === "instagram")
        );
        setSelectedAccountId(first?.id ?? "");
      })
      .catch(() => setError("Unable to load connected accounts."))
      .finally(() => setLoadingAccounts(false));
  }, [open]);

  if (!open) return null;

  async function handleMediaUpload(file: File | null) {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/publishing/media", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        mediaUrl?: string;
        mediaType?: PublishingMediaType;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to upload media.");
        return;
      }

      setMediaUrl(payload.mediaUrl ?? null);
      setMediaType(payload.mediaType ?? null);
    } catch {
      setError("Unable to upload media.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedAccountId) {
      setError("Select a connected account.");
      return;
    }

    if (selectedAccount?.platform === "instagram" && !mediaUrl) {
      setError("Instagram publishing requires media.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      contentId: contentId ?? null,
      socialAccountId: selectedAccountId,
      caption,
      mediaType,
      mediaUrl,
      timezone,
      ...(timing === "schedule"
        ? { scheduleDate, scheduleTime }
        : {}),
    };

    try {
      const endpoint =
        timing === "schedule" ? "/api/publishing/schedule" : "/api/publishing/publish";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to publish.");
        return;
      }

      onSuccess?.(
        timing === "schedule"
          ? "Post scheduled successfully."
          : "Post published successfully."
      );
      onClose();
    } catch {
      setError("Unable to reach the publishing service.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-lg border border-border/80 bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-panel-title"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Publish</p>
            <h2 id="publish-panel-title" className="text-lg font-semibold text-foreground">
              Send to social
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {error && (
            <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <section>
            <p className="text-xs font-medium text-muted-foreground">Account</p>
            {loadingAccounts ? (
              <div className="mt-3 h-10 animate-pulse rounded-md bg-secondary/30" />
            ) : publishableAccounts.length === 0 ? (
              <div className="mt-3 rounded-md border border-border/60 px-3 py-3 text-sm text-muted-foreground">
                No connected social accounts.{" "}
                <Link href="/social" className="text-foreground underline-offset-4 hover:underline">
                  Connect an account
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {publishableAccounts.map((account) => (
                  <label
                    key={account.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                      selectedAccountId === account.id
                        ? "border-adtraxio-accent/40 bg-adtraxio-accent/5"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <input
                      type="radio"
                      name="publish-account"
                      value={account.id}
                      checked={selectedAccountId === account.id}
                      onChange={() => setSelectedAccountId(account.id)}
                      className="sr-only"
                    />
                    <PlatformIcon platform={account.platform} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {account.accountName ?? account.username ?? account.platform}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="text-xs font-medium text-muted-foreground">Content</p>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {caption.trim() || "No caption yet."}
            </p>
          </section>

          <section>
            <p className="text-xs font-medium text-muted-foreground">Media</p>
            <div className="mt-3 space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleMediaUpload(file);
                }}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border/70 file:bg-secondary/40 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
              />
              {uploading && (
                <p className="text-xs text-muted-foreground">Uploading media…</p>
              )}
              {mediaUrl && (
                <p className="truncate text-xs text-adtraxio-accent">Media attached</p>
              )}
              {selectedAccount?.platform === "instagram" && !mediaUrl && (
                <p className="text-xs text-muted-foreground">
                  Instagram requires an image for publishing.
                </p>
              )}
            </div>
          </section>

          <section>
            <p className="text-xs font-medium text-muted-foreground">Timing</p>
            <div className="mt-3 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="timing"
                  checked={timing === "now"}
                  onChange={() => setTiming("now")}
                />
                Publish now
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="timing"
                  checked={timing === "schedule"}
                  onChange={() => setTiming("schedule")}
                />
                Schedule
              </label>
            </div>

            {timing === "schedule" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  Date
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  Time
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-muted-foreground sm:col-span-2">
                  Timezone
                  <input
                    type="text"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-border/60 px-5 py-4">
          <Button
            type="button"
            className="w-full bg-adtraxio-accent hover:bg-adtraxio-accent/90"
            disabled={
              submitting ||
              uploading ||
              loadingAccounts ||
              publishableAccounts.length === 0
            }
            onClick={() => void handleSubmit()}
          >
            {submitting
              ? "Working…"
              : timing === "schedule"
                ? "Schedule post"
                : "Publish now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
