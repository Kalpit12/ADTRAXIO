"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExperimentNewView() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [vA, setVa] = useState("Variant A");
  const [vB, setVb] = useState("Variant B");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective,
          hypothesis,
          successMetric: "engagement",
          minimumObservationDays: 14,
          variants: [
            { name: vA, variantKey: "A", allocationPercent: 50, description: vA },
            { name: vB, variantKey: "B", allocationPercent: 50, description: vB },
          ],
        }),
      });
      const payload = (await res.json()) as { experiment?: { id: string }; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed");
      router.push(`/assistant/experiments/${payload.experiment!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <Link
        href="/assistant/experiments"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Experiments
      </Link>
      <h1 className="text-lg font-semibold">New experiment</h1>
      <div className="mt-4 max-w-lg space-y-3">
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Objective"
          rows={2}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
        />
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Hypothesis"
          rows={3}
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={vA}
          onChange={(e) => setVa(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={vB}
          onChange={(e) => setVb(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Fixed split 50% / 50%</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy || !name || !objective} onClick={() => void create()}>
          Create draft
        </Button>
      </div>
    </div>
  );
}
