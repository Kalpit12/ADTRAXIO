import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityAction, ActivityLogEntry } from "./types";

type ActivityRow = {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapActivity(row: ActivityRow): ActivityLogEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function recordActivity(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    clientWorkspaceId: string | null;
    actorId: string;
    entityType: string;
    entityId: string;
    action: ActivityAction | string;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    organization_id: input.organizationId,
    client_workspace_id: input.clientWorkspaceId,
    actor_id: input.actorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: input.metadata ?? null,
  });

  if (error) {
    if (error.code === "42P01") return;
    throw new Error(error.message);
  }
}

export async function listActivity(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    clientWorkspaceId?: string | null;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }
): Promise<ActivityLogEntry[]> {
  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);

  if (input.clientWorkspaceId) {
    query = query.eq("client_workspace_id", input.clientWorkspaceId);
  }

  if (input.entityType && input.entityId) {
    query = query.eq("entity_type", input.entityType).eq("entity_id", input.entityId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapActivity(row as ActivityRow));
}
