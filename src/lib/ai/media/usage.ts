import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaProvider, MediaType } from "./types";

export async function recordMediaUsageEvent(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    clientWorkspaceId: string | null;
    userId: string;
    generationJobId: string;
    provider: MediaProvider;
    mediaType: MediaType;
    model?: string;
    units?: Record<string, unknown>;
    estimatedCostUsd?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.from("ai_media_usage_events").insert({
    organization_id: params.organizationId,
    client_workspace_id: params.clientWorkspaceId,
    user_id: params.userId,
    generation_job_id: params.generationJobId,
    provider: params.provider,
    media_type: params.mediaType,
    model: params.model ?? null,
    units: params.units ?? {},
    estimated_cost_usd:
      params.estimatedCostUsd !== undefined && params.estimatedCostUsd !== null
        ? params.estimatedCostUsd
        : null,
  });

  if (error) {
    console.error("[ai-media] usage event insert failed", error.message);
  }
}
