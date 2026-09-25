"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const fieldClass =
  "flex h-9 w-full rounded-md border border-border/70 bg-transparent px-3 py-1 text-sm text-foreground outline-none focus:border-adtraxio-accent/50";
const labelClass = "text-sm font-medium text-foreground";
import type { ClientMember, ClientRole } from "@/lib/workspaces/types";
import { CLIENT_ROLES } from "@/lib/workspaces/types";

const ROLE_LABELS: Record<ClientRole, string> = {
  owner: "Owner",
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

interface ClientMembersViewProps {
  clientId: string;
}

export function ClientMembersView({ clientId }: ClientMembersViewProps) {
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientRole>("editor");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/members`);
      const payload = (await response.json()) as {
        members?: ClientMember[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to load members.");
        return;
      }

      setMembers(payload.members ?? []);
    } catch {
      setError("Unable to load members.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviting(true);
    setError(null);
    setInviteUrl(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const payload = (await response.json()) as {
        inviteUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Unable to send invitation.");
        return;
      }

      setInviteUrl(payload.inviteUrl ?? null);
      setEmail("");
      void loadMembers();
    } catch {
      setError("Unable to send invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberId: string, newRole: ClientRole) {
    try {
      const response = await fetch(`/api/clients/${clientId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to update role.");
        return;
      }

      void loadMembers();
    } catch {
      setError("Unable to update role.");
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member's access?")) return;

    try {
      const response = await fetch(
        `/api/clients/${clientId}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to remove member.");
        return;
      }

      void loadMembers();
    } catch {
      setError("Unable to remove member.");
    }
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <Link
          href={`/clients/${clientId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Client
        </Link>
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          Team members
        </h1>
      </header>

      <form onSubmit={handleInvite} className="max-w-md space-y-4 rounded-lg border border-border/70 p-4">
        <p className="text-sm font-medium text-foreground">Invite member</p>
        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="role" className={labelClass}>
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as ClientRole)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            {CLIENT_ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={inviting || !email.trim()}>
          {inviting ? "Inviting…" : "Send invitation"}
        </Button>
        {inviteUrl && (
          <p className="break-all text-xs text-muted-foreground">
            Dev invitation URL: {inviteUrl}
          </p>
        )}
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/70">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border/60 bg-secondary/20 px-4 py-3 text-xs font-medium text-muted-foreground sm:px-6">
            <span>Member</span>
            <span>Role</span>
            <span className="sr-only sm:not-sr-only">Actions</span>
          </div>
          {members.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No members yet.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border/60 px-4 py-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:px-6"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.fullName ?? "Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.userId}</p>
                </div>
                <select
                  value={member.role}
                  onChange={(e) =>
                    void changeRole(member.id, e.target.value as ClientRole)
                  }
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  disabled={member.role === "owner"}
                >
                  {CLIENT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={member.role === "owner"}
                  onClick={() => void removeMember(member.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
