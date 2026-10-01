"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RemoveMemberDialog } from "@/components/workspaces/remove-member-dialog";
import { WorkspaceError } from "@/components/workspaces/workspace-error";
import { WorkspaceMembersSkeleton } from "@/components/workspaces/workspace-skeleton";
import { WorkspaceRole } from "@/components/workspaces/workspace-role";
import { WorkspaceSettingsSection } from "@/components/workspaces/workspace-settings-section";
import { Button } from "@/components/ui/button";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  formatMemberDisplayName,
} from "@/lib/workspaces/display";
import type { ClientMember, ClientRole } from "@/lib/workspaces/types";
import { CLIENT_ROLES } from "@/lib/workspaces/types";

const fieldClass =
  "w-full rounded-md border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-adtraxio-accent/40";

interface ClientMembersViewProps {
  clientId: string;
}

export function ClientMembersView({ clientId }: ClientMembersViewProps) {
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClientRole>("editor");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ClientMember | null>(null);
  const [removing, setRemoving] = useState(false);

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
        setError(payload.error ?? "Unable to create invitation.");
        return;
      }

      setInviteUrl(payload.inviteUrl ?? null);
      setLastInvitedEmail(email.trim());
      setEmail("");
      void loadMembers();
    } catch {
      setError("Unable to create invitation.");
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

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const response = await fetch(
        `/api/clients/${clientId}/members?memberId=${removeTarget.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to remove member.");
        return;
      }

      setRemoveTarget(null);
      void loadMembers();
    } catch {
      setError("Unable to remove member.");
    } finally {
      setRemoving(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-10">
      <Link
        href={`/clients/${clientId}`}
        className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        ← Client workspace
      </Link>

      <PageHeader
        title="Team members"
        description="People who can access this client workspace and their roles."
      />

      <WorkspaceSettingsSection
        title="Invite"
        description="Share the invitation link with your teammate. Email is not sent automatically in this environment."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
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
            <label htmlFor="role" className="text-sm font-medium text-foreground">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as ClientRole)}
              className={fieldClass}
            >
              {CLIENT_ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
          <Button type="submit" size="sm" disabled={inviting || !email.trim()}>
            {inviting ? "Creating invitation…" : "Create invitation link"}
          </Button>
          {inviteUrl && (
            <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-3 py-3 text-xs">
              <p className="font-medium text-foreground">Invitation ready</p>
              <p className="mt-1 text-muted-foreground">
                Share this link with {lastInvitedEmail ?? "your invitee"}. It grants access to
                this client workspace as {ROLE_LABELS[role]}.
              </p>
              <p className="mt-2 break-all text-muted-foreground">{inviteUrl}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void copyInviteLink()}
              >
                Copy link
              </Button>
            </div>
          )}
        </form>
      </WorkspaceSettingsSection>

      {error && <WorkspaceError message={error} />}

      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="font-heading text-lg tracking-tight text-foreground">
          Members
        </h2>

        {loading ? (
          <div className="mt-4">
            <WorkspaceMembersSkeleton />
          </div>
        ) : members.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No members yet. Create an invitation to add someone.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-border/60">
            <div className="hidden border-b border-border/60 bg-adtraxio-surface/10 px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-4">
              <span>Member</span>
              <span>Role</span>
              <span className="text-right">Actions</span>
            </div>
            <ul>
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 border-b border-border/50 px-4 py-4 last:border-0 sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatMemberDisplayName({ fullName: member.fullName })}
                    </p>
                    <WorkspaceRole role={member.role} className="mt-2 sm:hidden" />
                  </div>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      void changeRole(member.id, e.target.value as ClientRole)
                    }
                    className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs"
                    disabled={member.role === "owner"}
                    aria-label={`Role for ${formatMemberDisplayName({ fullName: member.fullName })}`}
                  >
                    {CLIENT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <div className="sm:text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={member.role === "owner"}
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <RemoveMemberDialog
        open={removeTarget != null}
        memberName={removeTarget?.fullName ?? "Member"}
        loading={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
