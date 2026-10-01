import { NextResponse } from "next/server";
import { jsonMediaError } from "@/lib/ai/media/api";
import {
  buildScopeFromAuth,
  getMediaGenerationJobForScope,
  processMediaGenerationJob,
} from "@/lib/ai/media/service";
import { requireAuthContext } from "@/lib/social/auth-context";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { jobId } = await context.params;
  const scope = buildScopeFromAuth(
    auth.organizationId,
    auth.user.id,
    auth.workspace.clientWorkspaceId
  );

  try {
    let job = await getMediaGenerationJobForScope(auth.supabase, scope, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.status === "processing" && job.mediaType === "video") {
      await processMediaGenerationJob(jobId);
      job = await getMediaGenerationJobForScope(auth.supabase, scope, jobId);
    }

    return NextResponse.json({ job });
  } catch (error) {
    return jsonMediaError(error);
  }
}
