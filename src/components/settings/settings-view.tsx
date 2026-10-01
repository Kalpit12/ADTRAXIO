"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsLinkRow } from "@/components/settings/settings-link-row";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { WorkspaceRole } from "@/components/workspaces/workspace-role";
import { WorkspaceSettingsSection } from "@/components/workspaces/workspace-settings-section";
import { WorkspaceTypeLabel } from "@/components/workspaces/workspace-type-label";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export function SettingsView() {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspaces/context")
      .then((r) => r.json())
      .then((payload: { workspace?: WorkspaceContext }) => {
        if (payload.workspace) setWorkspace(payload.workspace);
      })
      .catch(() => undefined)
      .finally(() => setWorkspaceLoading(false));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setAccountEmail(user.email ?? null);
      const meta = user.user_metadata as { full_name?: string; name?: string };
      setAccountName(meta.full_name?.trim() || meta.name?.trim() || null);
    });
  }, []);

  const inClient =
    workspace?.isAgency && workspace.clientWorkspaceId != null;

  if (workspaceLoading && !workspace) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Manage your account, workspace, and connected services."
      />

      <WorkspaceSettingsSection title="Account">
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Personal sign-in for ADTRAXIO. Profile editing beyond what is shown
            here is not available in the app yet.
          </p>
          {accountName && (
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="mt-0.5 font-medium text-foreground">{accountName}</p>
            </div>
          )}
          {accountEmail && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="mt-0.5 font-medium text-foreground">{accountEmail}</p>
            </div>
          )}
          {!accountEmail && !accountName && (
            <p className="text-muted-foreground">Signed in to your workspace.</p>
          )}
        </div>
      </WorkspaceSettingsSection>

      <WorkspaceSettingsSection
        title="Workspace"
        description={
          inClient
            ? "You are operating inside a client workspace. Switch context from the workspace bar when you need your agency home."
            : "Organization-level context for campaigns, content, and billing."
        }
      >
        {workspace ? (
          <div className="space-y-3 text-sm">
            <WorkspaceTypeLabel
              type={
                inClient
                  ? "client"
                  : workspace.isAgency
                    ? "agency"
                    : "standard"
              }
            />
            <p className="font-medium text-foreground">
              {inClient
                ? workspace.clientWorkspace?.name
                : workspace.isAgency
                  ? "Your agency"
                  : "Your workspace"}
            </p>
            {inClient && workspace.clientRole && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Your role in this client workspace
                </p>
                <WorkspaceRole
                  role={workspace.clientRole}
                  showDescription
                  className="mt-2"
                />
              </div>
            )}
            {workspace.isAgency && !inClient && (
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/clients">Manage client workspaces</Link>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Unable to load workspace context.
          </p>
        )}
      </WorkspaceSettingsSection>

      {workspace?.isAgency && (
        <WorkspaceSettingsSection
          title="Clients & team"
          description="Member management is per client workspace."
        >
          <SettingsLinkRow
            href="/clients"
            title="Client workspaces & members"
            description="Create clients, invite members, and manage access."
          />
        </WorkspaceSettingsSection>
      )}

      <WorkspaceSettingsSection title="Connections">
        <SettingsLinkRow
          href="/social"
          title="Social connections"
          description="Connect and manage Facebook, Instagram, and linked accounts."
        />
      </WorkspaceSettingsSection>

      <WorkspaceSettingsSection title="Billing">
        <SettingsLinkRow
          href="/billing"
          title="Plans & billing"
          description="View your plan, usage limits, and manage your subscription."
        />
      </WorkspaceSettingsSection>
    </div>
  );
}
