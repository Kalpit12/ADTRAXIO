import { PLATFORM_LABELS, SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getCachedDashboardData,
  invalidateDashboardDataCache,
} from "@/lib/dashboard/dashboard-data-cache";
import { emptyMetrics } from "@/lib/dashboard/load-overview";
import type { DashboardData } from "./types";

export { invalidateDashboardDataCache };

const DASHBOARD_FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Dashboard request timed out. Check your connection."));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchDashboardOverview(): Promise<{
  data?: DashboardData;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        user: {
          id: "local",
          firstName: "there",
          fullName: null,
          profileName: null,
          accountType: null,
        },
        metrics: emptyMetrics(),
        performanceSeries: [],
        hasPerformanceData: false,
        activeCampaignCount: 0,
        campaigns: [],
        content: [],
        connectedAccounts: SOCIAL_PLATFORMS.map(({ id, label }) => ({
          platform: id,
          label,
          connected: false,
        })),
      },
    };
  }

  try {
    const response = await withTimeout(
      fetch("/api/dashboard/overview", {
        credentials: "include",
        cache: "no-store",
      }),
      DASHBOARD_FETCH_TIMEOUT_MS
    );

    const payload = (await response.json()) as {
      data?: DashboardData;
      error?: string;
    };

    if (!response.ok) {
      return {
        error: payload.error ?? "Unable to load dashboard.",
      };
    }

    if (!payload.data) {
      return { error: "Unable to load dashboard." };
    }

    return { data: payload.data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard.";
    return { error: message };
  }
}

export async function getDashboardData(): Promise<{
  data?: DashboardData;
  error?: string;
}> {
  return getCachedDashboardData(fetchDashboardOverview);
}

export function formatPlatformLabel(platform: string) {
  return (
    PLATFORM_LABELS[platform as SocialPlatform] ??
    platform.charAt(0).toUpperCase() + platform.slice(1)
  );
}
