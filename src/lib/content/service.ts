import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrganizationId } from "@/lib/org/get-organization-id";
import { fetchWorkspaceContext } from "@/lib/workspaces/client-context";
import {
  applyClientWorkspaceScope,
  type FilterableQuery,
} from "@/lib/workspaces/query-scope";
import { workspaceScopeFromContext } from "@/lib/workspaces/scope";
import {
  createLocalDraftId,
  getLocalDraft,
  listLocalDrafts,
  saveLocalDraft,
} from "./storage";
import type {
  ContentDraft,
  ContentDraftSummary,
  ContentStatus,
  CreativeBrief,
  GeneratedCreative,
} from "./types";

type ContentRow = {
  id: string;
  user_id: string;
  organization_id: string;
  content_type: string;
  platform: string;
  goal: string;
  audience: string | null;
  tone: string;
  topic: string;
  additional_context: string | null;
  cta: string | null;
  hook: string | null;
  headline: string | null;
  primary_copy: string | null;
  caption: string | null;
  hashtags: string[] | null;
  creative_direction: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapRowToDraft(row: ContentRow): ContentDraft {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    brief: {
      contentType: row.content_type as ContentDraft["brief"]["contentType"],
      goal: row.goal as ContentDraft["brief"]["goal"],
      platform: row.platform as ContentDraft["brief"]["platform"],
      audience: row.audience ?? "",
      tone: row.tone as ContentDraft["brief"]["tone"],
      topic: row.topic,
      additionalContext: row.additional_context ?? "",
      cta: row.cta ?? "",
    },
    creative: {
      hook: row.hook ?? "",
      headline: row.headline ?? "",
      primaryCopy: row.primary_copy ?? "",
      cta: row.cta ?? "",
      caption: row.caption ?? "",
      hashtags: row.hashtags ?? [],
      creativeDirection: row.creative_direction ?? "",
    },
    status: row.status as ContentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDraftToInsert(
  draft: ContentDraft,
  userId: string,
  organizationId: string,
  clientWorkspaceId: string | null = null
) {
  return {
    id: draft.id.startsWith("local-") ? undefined : draft.id,
    user_id: userId,
    organization_id: organizationId,
    client_workspace_id: clientWorkspaceId,
    content_type: draft.brief.contentType,
    platform: draft.brief.platform,
    goal: draft.brief.goal,
    audience: draft.brief.audience || null,
    tone: draft.brief.tone,
    topic: draft.brief.topic,
    additional_context: draft.brief.additionalContext || null,
    cta: draft.creative.cta || draft.brief.cta || null,
    hook: draft.creative.hook,
    headline: draft.creative.headline,
    primary_copy: draft.creative.primaryCopy,
    caption: draft.creative.caption,
    hashtags: draft.creative.hashtags,
    creative_direction: draft.creative.creativeDirection,
    status: draft.status,
  };
}

export async function listRecentDrafts(): Promise<{
  data?: ContentDraftSummary[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { data: listLocalDrafts() };
  }

  const supabase = createClient();
  if (!supabase) {
    return { data: listLocalDrafts() };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in." };
  }

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) {
    return { data: [] };
  }

  const { workspace } = await fetchWorkspaceContext();
  const scope = workspace
    ? workspaceScopeFromContext(workspace)
    : { isAgency: false, clientWorkspaceId: null };

  const contentQuery = supabase
    .from("content")
    .select("id, headline, platform, content_type, status, updated_at")
    .eq("organization_id", orgId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(8);

  const scopedQuery = applyClientWorkspaceScope(
    contentQuery as unknown as FilterableQuery,
    scope
  );

  type ContentListRow = {
    id: string;
    headline: string;
    platform: string;
    content_type: string;
    status: string;
    updated_at: string;
  };

  const { data, error } = await (scopedQuery as unknown as PromiseLike<{
    data: ContentListRow[] | null;
    error: { code?: string; message: string } | null;
  }>);

  if (error) {
    if (error.code === "42P01") {
      return { data: listLocalDrafts() };
    }
    return { error: error.message };
  }

  return {
    data:
      data?.map((row) => ({
        id: row.id,
        headline: row.headline,
        platform: row.platform as ContentDraftSummary["platform"],
        contentType: row.content_type as ContentDraftSummary["contentType"],
        status: row.status as ContentDraftSummary["status"],
        updatedAt: row.updated_at,
      })) ?? [],
  };
}

export async function getDraft(id: string): Promise<{
  data?: ContentDraft;
  error?: string;
}> {
  if (id.startsWith("local-") || !isSupabaseConfigured()) {
    const local = getLocalDraft(id);
    return local ? { data: local } : { error: "Draft not found." };
  }

  const supabase = createClient();
  if (!supabase) {
    const local = getLocalDraft(id);
    return local ? { data: local } : { error: "Draft not found." };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in." };
  }

  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      const local = getLocalDraft(id);
      return local ? { data: local } : { error: "Draft not found." };
    }
    return { error: error.message };
  }

  if (!data) {
    return { error: "Draft not found." };
  }

  return { data: mapRowToDraft(data as ContentRow) };
}

export async function saveDraft(input: {
  id?: string;
  brief: CreativeBrief;
  creative: GeneratedCreative;
  status?: ContentStatus;
}): Promise<{ data?: ContentDraft; error?: string }> {
  const now = new Date().toISOString();
  const status = input.status ?? "draft";

  if (!isSupabaseConfigured()) {
    const draft: ContentDraft = {
      id: input.id ?? createLocalDraftId(),
      userId: "local",
      organizationId: "local",
      brief: input.brief,
      creative: input.creative,
      status,
      createdAt: now,
      updatedAt: now,
    };
    return { data: saveLocalDraft(draft) };
  }

  const supabase = createClient();
  if (!supabase) {
    const draft: ContentDraft = {
      id: input.id ?? createLocalDraftId(),
      userId: "local",
      organizationId: "local",
      brief: input.brief,
      creative: input.creative,
      status,
      createdAt: now,
      updatedAt: now,
    };
    return { data: saveLocalDraft(draft) };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in." };
  }

  const orgId = await getOrganizationId(supabase, user.id);
  if (!orgId) {
    return { error: "No workspace found. Complete onboarding first." };
  }

  const { workspace } = await fetchWorkspaceContext();
  if (workspace?.isAgency && !workspace.clientWorkspaceId) {
    return { error: "Select a client workspace to create content." };
  }

  const clientWorkspaceId = workspace?.isAgency
    ? workspace.clientWorkspaceId
    : null;

  const draftId = input.id?.startsWith("local-") ? undefined : input.id;
  const draft: ContentDraft = {
    id: draftId ?? createLocalDraftId(),
    userId: user.id,
    organizationId: orgId,
    brief: input.brief,
    creative: input.creative,
    status,
    createdAt: now,
    updatedAt: now,
  };

  const payload = mapDraftToInsert(draft, user.id, orgId, clientWorkspaceId);

  if (draftId) {
    const { data, error } = await supabase
      .from("content")
      .update(payload)
      .eq("id", draftId)
      .select("*")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return { data: saveLocalDraft(draft) };
      }
      return { error: error.message };
    }

    return { data: mapRowToDraft(data as ContentRow) };
  }

  const { data, error } = await supabase
    .from("content")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return { data: saveLocalDraft(draft) };
    }
    return { error: error.message };
  }

  return { data: mapRowToDraft(data as ContentRow) };
}
