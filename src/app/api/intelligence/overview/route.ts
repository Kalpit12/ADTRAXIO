import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { buildIntelligenceAnalysis, getLatestOverview } from "@/lib/intelligence/service";

export async function GET(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");

  try {
    const overview = await getLatestOverview(
      auth.supabase,
      auth.organizationId,
      auth.scope,
      { campaignId }
    );

    let dataAvailability = overview.dataAvailability;
    let platformsAnalyzed = overview.platformsAnalyzed;
    let campaignsAnalyzed = overview.campaignsAnalyzed;

    if (!dataAvailability) {
      try {
        const analysis = await buildIntelligenceAnalysis(
          auth.supabase,
          auth.organizationId,
          { campaignId, preset: "30d", scope: auth.scope }
        );
        dataAvailability = analysis.dataAvailability;
        platformsAnalyzed = analysis.platforms;
        campaignsAnalyzed = analysis.campaigns.length;
      } catch {
        dataAvailability = null;
      }
    }

    return NextResponse.json({
      overview: {
        ...overview,
        dataAvailability,
        platformsAnalyzed,
        campaignsAnalyzed,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load intelligence overview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
