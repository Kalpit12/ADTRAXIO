import { NextResponse } from "next/server";
import { getAuthorizedMediaAsset } from "@/lib/ai/media/assets/access";
import { saveMediaEdit as persistMediaEdit } from "@/lib/ai/media/assets/edits-service";
import { jsonMediaError } from "@/lib/ai/media/api";
import { toPublicAsset } from "@/lib/ai/media/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthContext } from "@/lib/social/auth-context";
import {
  parseEditOperations,
  validateTrim,
  validateVolume,
} from "@/lib/media-editor/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const auth = await requireAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { assetId } = await context.params;

  try {
    const sourceAsset = await getAuthorizedMediaAsset(
      auth.supabase,
      assetId,
      auth.organizationId,
      auth.workspace.clientWorkspaceId
    );

    if (!sourceAsset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let operationsRaw: unknown;
    let fileBuffer: Buffer | undefined;
    let fileMime: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const opsField = form.get("operations");
      if (typeof opsField !== "string") {
        return NextResponse.json(
          { error: "Invalid edit operations." },
          { status: 400 }
        );
      }
      operationsRaw = JSON.parse(opsField);
      const file = form.get("file");
      if (file instanceof File) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
        fileMime = file.type || "image/png";
      }
    } else {
      const body = (await request.json()) as { operations?: unknown };
      operationsRaw = body.operations;
    }

    const operations = parseEditOperations(operationsRaw);
    if (!operations) {
      return NextResponse.json(
        { error: "Invalid edit operations." },
        { status: 400 }
      );
    }

    for (const op of operations) {
      if (op.type === "trim") {
        const duration = sourceAsset.duration_seconds
          ? Number(sourceAsset.duration_seconds)
          : 0;
        const err = validateTrim(op.start, op.end, duration);
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 });
        }
      }
      if (op.type === "volume") {
        const err = validateVolume(op.level);
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 });
        }
      }
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Media storage is not configured." },
        { status: 503 }
      );
    }
    const created = await persistMediaEdit(admin, {
      sourceAsset,
      operations,
      renderedBuffer: fileBuffer,
      renderedMimeType: fileMime,
      userId: auth.user.id,
    });

    const rendered =
      sourceAsset.media_type === "image" && Boolean(fileBuffer);

    return NextResponse.json({
      asset: toPublicAsset(created),
      rendered,
    });
  } catch (error) {
    return jsonMediaError(error);
  }
}
