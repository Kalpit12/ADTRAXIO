import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrganizationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership?.organization_id) {
    return membership.organization_id;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  return org?.id ?? null;
}
