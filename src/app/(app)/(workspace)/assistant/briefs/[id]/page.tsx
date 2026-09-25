"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GrowthBriefDetail } from "@/components/assistant/growth-brief-detail";
import type { GrowthBriefRecord } from "@/lib/agent/types";

export default function GrowthBriefDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [brief, setBrief] = useState<GrowthBriefRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agent/brief/${id}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          brief?: GrowthBriefRecord;
          error?: string;
        };
        if (!res.ok) {
          setError(payload.error ?? "Brief not found.");
          return;
        }
        setBrief(payload.brief ?? null);
      })
      .catch(() => setError("Unable to load brief."));
  }, [id]);

  if (error) {
    return <p className="p-6 text-sm text-muted-foreground">{error}</p>;
  }
  if (!brief) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Loading growth brief…</p>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <GrowthBriefDetail brief={brief} />
    </div>
  );
}
