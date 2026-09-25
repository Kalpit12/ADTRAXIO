"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PrepareExecutionButton({
  objective,
  growthBriefId,
  recommendationIndex,
  label = "Prepare",
}: {
  objective: string;
  growthBriefId: string;
  recommendationIndex: number;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrepare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/execution/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          growthBriefId,
          recommendationIndex,
        }),
      });
      const payload = (await res.json()) as {
        plan?: { id: string };
        reviewUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Unable to prepare.");
        return;
      }
      const id = payload.plan?.id;
      if (id) {
        router.push(`/assistant/execution/${id}`);
      } else if (payload.reviewUrl) {
        router.push(payload.reviewUrl);
      }
    } catch {
      setError("Unable to prepare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void handlePrepare()}
      >
        {loading ? "Preparing…" : label}
      </Button>
      {error && <span className="text-xs text-red-400/90">{error}</span>}
    </div>
  );
}
