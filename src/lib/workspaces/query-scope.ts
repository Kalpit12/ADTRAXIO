import type { SupabaseClient } from "@supabase/supabase-js";

export type FilterableQuery = {
  is: (column: string, value: null | string) => FilterableQuery;
  eq: (column: string, value: string) => FilterableQuery;
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Applies client workspace scoping for data queries.
 * - Non-agency: legacy rows with null client_workspace_id
 * - Agency + client selected: that client's rows
 * - Agency + no client: returns no operational rows
 */
export function applyClientWorkspaceScope<T extends FilterableQuery>(
  query: T,
  options: {
    isAgency: boolean;
    clientWorkspaceId: string | null;
  }
): T {
  if (!options.isAgency) {
    return query.is("client_workspace_id", null) as T;
  }

  if (options.clientWorkspaceId) {
    return query.eq("client_workspace_id", options.clientWorkspaceId) as T;
  }

  return query.eq("client_workspace_id", EMPTY_UUID) as T;
}

export async function verifyResourceClientScope(
  supabase: SupabaseClient,
  table: string,
  resourceId: string,
  organizationId: string,
  expectedClientWorkspaceId: string | null,
  isAgency: boolean
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("organization_id, client_workspace_id")
    .eq("id", resourceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Resource not found.");
  }

  if (data.organization_id !== organizationId) {
    throw new Error("Resource not found in this workspace.");
  }

  const rowClientId = data.client_workspace_id as string | null;

  if (!isAgency) {
    if (rowClientId != null) {
      throw new Error("Resource not found in this workspace.");
    }
    return;
  }

  if (expectedClientWorkspaceId) {
    if (rowClientId !== expectedClientWorkspaceId) {
      throw new Error("Resource belongs to a different client workspace.");
    }
  } else if (rowClientId != null) {
    throw new Error("Select a client workspace to access this resource.");
  }
}
