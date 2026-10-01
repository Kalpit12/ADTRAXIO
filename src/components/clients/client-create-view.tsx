"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkspaceSettingsSection } from "@/components/workspaces/workspace-settings-section";
import { WorkspaceError } from "@/components/workspaces/workspace-error";
import { Button } from "@/components/ui/button";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/workspaces/display";
import type { ClientRole } from "@/lib/workspaces/types";

const fieldClass =
  "w-full rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40 focus:ring-2 focus:ring-adtraxio-accent/15";

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

  const ownerRole: ClientRole = "owner";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Agency workspace"
        title="Add client"
        description="Create a focused workspace for a client's social growth operations."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <WorkspaceSettingsSection title="Identity">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
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
              <label htmlFor="slug" className="text-sm font-medium text-foreground">
                Workspace URL slug
              </label>
              <input
                id="slug"
                className={fieldClass}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Generated from the name if left blank.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description
              </label>
              <textarea
                id="description"
                className={`${fieldClass} min-h-[80px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for your team"
                rows={3}
              />
            </div>
          </div>
        </WorkspaceSettingsSection>

        <WorkspaceSettingsSection
          title="Access"
          description="Invite a client-side owner after creation, or add an email now to send an invitation link."
        >
          <div className="space-y-2">
            <label htmlFor="ownerEmail" className="text-sm font-medium text-foreground">
              Initial owner email (optional)
            </label>
            <input
              id="ownerEmail"
              type="email"
              className={fieldClass}
              value={initialOwnerEmail}
              onChange={(e) => setInitialOwnerEmail(e.target.value)}
              placeholder="manager@client.com"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {ROLE_LABELS[ownerRole]} — {ROLE_DESCRIPTIONS[ownerRole]}
            </p>
            <p className="text-xs text-muted-foreground">
              Invitations are shared via link in this environment — email delivery
              is not automatic unless configured separately.
            </p>
          </div>
        </WorkspaceSettingsSection>

        {error && <WorkspaceError message={error} />}

        <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create client workspace"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/clients">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
