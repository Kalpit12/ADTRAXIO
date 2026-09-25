import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationRecord, NotificationType } from "./types";

type NotificationRow = {
  id: string;
  organization_id: string;
  recipient_id: string;
  client_workspace_id: string | null;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipientId: row.recipient_id,
    clientWorkspaceId: row.client_workspace_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createNotification(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    recipientId: string;
    clientWorkspaceId?: string | null;
    type: NotificationType | string;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: string | null;
  }
): Promise<void> {
  if (input.recipientId === "") return;

  const { error } = await supabase.from("notifications").insert({
    organization_id: input.organizationId,
    recipient_id: input.recipientId,
    client_workspace_id: input.clientWorkspaceId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });

  if (error) {
    if (error.code === "42P01") return;
    throw new Error(error.message);
  }
}

export async function listNotifications(
  supabase: SupabaseClient,
  recipientId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
    clientWorkspaceId?: string | null;
    isAgency?: boolean;
  }
): Promise<NotificationRecord[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 30);

  if (options?.isAgency && options.clientWorkspaceId) {
    query = query.or(
      `client_workspace_id.is.null,client_workspace_id.eq.${options.clientWorkspaceId}`
    );
  }

  if (options?.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapNotification(row as NotificationRow));
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  recipientId: string,
  options?: { clientWorkspaceId?: string | null; isAgency?: boolean }
): Promise<number> {
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .is("read_at", null);

  if (options?.isAgency && options.clientWorkspaceId) {
    query = query.or(
      `client_workspace_id.is.null,client_workspace_id.eq.${options.clientWorkspaceId}`
    );
  }

  const { count, error } = await query;

  if (error) {
    if (error.code === "42P01") return 0;
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  recipientId: string,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", recipientId);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  recipientId: string,
  options?: { clientWorkspaceId?: string | null; isAgency?: boolean }
): Promise<void> {
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", recipientId)
    .is("read_at", null);

  if (options?.isAgency && options.clientWorkspaceId) {
    query = query.or(
      `client_workspace_id.is.null,client_workspace_id.eq.${options.clientWorkspaceId}`
    );
  }

  const { error } = await query;

  if (error) throw new Error(error.message);
}
