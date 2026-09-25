import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadLocalOnboarding,
  saveLocalOnboarding,
} from "@/lib/onboarding/storage";
import type { OnboardingData, OnboardingStepIndex } from "./types";
import { defaultOnboardingData } from "./types";

function toStepIndex(value: unknown): OnboardingStepIndex {
  const step = typeof value === "number" ? value : 0;
  if (step >= 0 && step <= 5) return step as OnboardingStepIndex;
  return 0;
}

type ServiceResult = { error?: string; data?: OnboardingData };

function rowToData(row: Record<string, unknown>, goals: string[], platforms: string[]): OnboardingData {
  return {
    step: toStepIndex(row.onboarding_step),
    accountType: (row.account_type as OnboardingData["accountType"]) ?? null,
    goals: goals as OnboardingData["goals"],
    profileName: (row.profile_name as string) ?? "",
    industry: (row.industry as string) ?? "",
    category: (row.category as string) ?? "",
    location: (row.location as string) ?? "",
    website: (row.website as string) ?? "",
    description: (row.description as string) ?? "",
    clientCount: row.client_count != null ? String(row.client_count) : "",
    industriesServed: (row.industries_served as string) ?? "",
    platforms: platforms as OnboardingData["platforms"],
    connectPlatformsLater: Boolean(row.connect_platforms_later),
    onboardingCompleted: Boolean(row.onboarding_completed),
  };
}

function dataToProfileRow(data: OnboardingData, userId: string) {
  return {
    id: userId,
    account_type: data.accountType,
    profile_name: data.profileName.trim() || null,
    industry: data.industry.trim() || null,
    category: data.category.trim() || null,
    location: data.location.trim() || null,
    website: data.website.trim() || null,
    description: data.description.trim() || null,
    client_count: data.clientCount ? parseInt(data.clientCount, 10) : null,
    industries_served: data.industriesServed.trim() || null,
    onboarding_step: data.step,
    onboarding_completed: data.onboardingCompleted,
    connect_platforms_later: data.connectPlatformsLater,
  };
}

export async function loadOnboardingData(): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) {
    return { data: loadLocalOnboarding() };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to connect to your workspace." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to continue onboarding." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }

  if (!profile) {
    return { data: defaultOnboardingData() };
  }

  const [{ data: goals }, { data: platforms }] = await Promise.all([
    supabase.from("user_goals").select("goal").eq("user_id", user.id),
    supabase.from("user_platforms").select("platform").eq("user_id", user.id),
  ]);

  return {
    data: rowToData(
      profile,
      goals?.map((g) => g.goal) ?? [],
      platforms?.map((p) => p.platform) ?? []
    ),
  };
}

export async function saveOnboardingProgress(
  data: OnboardingData
): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) {
    saveLocalOnboarding(data);
    return { data };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to connect to your workspace." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to save progress." };
  }

  const profileRow = dataToProfileRow(data, user.id);

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });

  if (profileError) {
    return { error: profileError.message };
  }

  await supabase.from("user_goals").delete().eq("user_id", user.id);
  if (data.goals.length > 0) {
    const { error: goalsError } = await supabase.from("user_goals").insert(
      data.goals.map((goal) => ({ user_id: user.id, goal }))
    );
    if (goalsError) return { error: goalsError.message };
  }

  await supabase.from("user_platforms").delete().eq("user_id", user.id);
  if (data.platforms.length > 0) {
    const { error: platformsError } = await supabase.from("user_platforms").insert(
      data.platforms.map((platform) => ({
        user_id: user.id,
        platform,
        connected: false,
      }))
    );
    if (platformsError) return { error: platformsError.message };
  }

  return { data };
}

export async function getPostAuthDestination(): Promise<string> {
  const result = await loadOnboardingData();
  if (result.data?.onboardingCompleted) return "/dashboard";
  return "/onboarding";
}

export async function completeOnboarding(
  data: OnboardingData
): Promise<ServiceResult> {
  const finalData: OnboardingData = {
    ...data,
    onboardingCompleted: true,
    step: 5,
  };

  if (!isSupabaseConfigured()) {
    saveLocalOnboarding(finalData);
    return { data: finalData };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to connect to your workspace." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to complete onboarding." };
  }

  const saveResult = await saveOnboardingProgress(finalData);
  if (saveResult.error) return saveResult;

  const orgName =
    finalData.profileName.trim() ||
    (finalData.accountType === "creator"
      ? "Creator Workspace"
      : finalData.accountType === "agency"
        ? "Agency Workspace"
        : "Business Workspace");

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existingOrg) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        type: finalData.accountType ?? "business",
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (orgError) return { error: orgError.message };

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) return { error: memberError.message };
  } else {
    await supabase
      .from("organizations")
      .update({ name: orgName, type: finalData.accountType ?? "business" })
      .eq("id", existingOrg.id);
  }

  return { data: finalData };
}
