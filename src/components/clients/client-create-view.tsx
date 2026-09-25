"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const fieldClass =
  "flex h-9 w-full rounded-md border border-border/70 bg-transparent px-3 py-1 text-sm text-foreground outline-none focus:border-adtraxio-accent/50";
const labelClass = "text-sm font-medium text-foreground";

export function ClientCreateView() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [initialOwnerEmail, setInitialOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || undefined,
          initialOwnerEmail: initialOwnerEmail || undefined,
        }),
      });

      const payload = (await response.json()) as {
        client?: { id: string };
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to create client.");
        return;
      }

      router.push(`/clients/${payload.client?.id ?? ""}`);
    } catch {
      setError("Unable to create client.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Agency</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground">
          New client
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a dedicated workspace for a client&apos;s social operations.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className={labelClass}>
            Client name
          </label>
          <input
            id="name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className={labelClass}>
            Slug
          </label>
          <input
            id="slug"
            className={fieldClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-corp"
          />
          <p className="text-xs text-muted-foreground">
            Used in workspace URLs. Auto-generated from name if left blank.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            className={`${fieldClass} min-h-[80px] py-2`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional client notes"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="ownerEmail" className={labelClass}>
            Initial client owner email (optional)
          </label>
          <input
            id="ownerEmail"
            type="email"
            className={fieldClass}
            value={initialOwnerEmail}
            onChange={(e) => setInitialOwnerEmail(e.target.value)}
            placeholder="manager@client.com"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create client"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/clients")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
