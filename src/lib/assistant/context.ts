import { getOrganizationEntitlements } from "@/lib/billing/entitlements";
import { getConnectedAccounts } from "@/lib/social/service";
import { formatBrandContextForPromptFromBrain } from "./brand-context";
import type { AssistantContext, WorkspaceContextSummary } from "./types";

export async function buildWorkspaceContextSummary(
  ctx: AssistantContext
): Promise<WorkspaceContextSummary> {
  const { plan } = await getOrganizationEntitlements(
    ctx.supabase,
    ctx.organizationId
  );

  let connectedPlatforms: string[] = [];
  try {
    const accounts = await getConnectedAccounts(
      ctx.supabase,
      ctx.organizationId,
      ctx.scope
    );
    connectedPlatforms = [
      ...new Set(
        accounts
          .filter((a) => a.status === "connected")
          .map((a) => a.platform)
      ),
    ];
  } catch {
    connectedPlatforms = [];
  }

  let workspaceType: WorkspaceContextSummary["workspaceType"] = "business";
  if (ctx.isAgency) {
    workspaceType = ctx.clientWorkspaceId ? "agency_client" : "agency";
  }

  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("type")
    .eq("id", ctx.organizationId)
    .maybeSingle();

  if (org?.type === "creator" && !ctx.isAgency) {
    workspaceType = "creator";
  }

  let clientName: string | null = null;
  if (ctx.clientWorkspaceId) {
    const { data: client } = await ctx.supabase
      .from("client_workspaces")
      .select("name")
      .eq("id", ctx.clientWorkspaceId)
      .maybeSingle();
    clientName = client?.name ?? null;
  }

  const { loadBrandBrainContext } = await import("./brand-brain/loader");
  const brain = await loadBrandBrainContext(ctx, { mode: "full" });
  const profile = brain.profile;
  const business: WorkspaceContextSummary["business"] =
    profile?.businessName || profile?.industry
      ? {
          organizationName: profile.businessName,
          industry: profile.industry,
          description: profile.description,
          goals: profile.goals,
        }
      : null;

  return {
    workspaceType,
    selectedClient: clientName,
    connectedPlatforms,
    plan,
    hasClientSelected: Boolean(ctx.clientWorkspaceId),
    business,
  };
}

export function assistantContextFromAuth(auth: {
  supabase: AssistantContext["supabase"];
  user: AssistantContext["user"];
  organizationId: string;
  scope: AssistantContext["scope"];
  workspace: {
    isAgency: boolean;
    clientWorkspaceId: string | null;
    clientWorkspace?: { name: string } | null;
    clientRole?: import("@/lib/workspaces/types").ClientRole | null;
    orgRole?: string | null;
  };
}): AssistantContext {
  return {
    supabase: auth.supabase,
    user: auth.user,
    organizationId: auth.organizationId,
    scope: auth.scope,
    clientWorkspaceId: auth.scope.clientWorkspaceId,
    isAgency: auth.workspace.isAgency,
    clientName: auth.workspace.clientWorkspace?.name ?? null,
    clientRole: auth.workspace.clientRole ?? null,
    orgRole: auth.workspace.orgRole ?? null,
  };
}
