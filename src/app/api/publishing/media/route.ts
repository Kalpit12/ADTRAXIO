import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireOperationalScopedAuth } from "@/lib/workspaces/api-auth";
import { toClientError } from "@/lib/publishing/errors";
import {
  buildPublicMediaUrl,
  sanitizeStoragePathSegment,
  validateUploadFile,
} from "@/lib/publishing/media";

export async function POST(request: Request) {
  const auth = await requireOperationalScopedAuth();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Media file is required." }, { status: 400 });
    }

    const { mediaType, mime } = await validateUploadFile(file);
    const extension = mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "video/quicktime"
          ? "mov"
          : mime === "video/mp4"
            ? "mp4"
            : "jpg";

    const orgSegment = sanitizeStoragePathSegment(auth.organizationId);
    const objectPath = `${orgSegment}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await auth.supabase.storage
      .from("content-media")
      .upload(objectPath, file, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Unable to upload media.", code: "upload_failed" },
        { status: 500 }
      );
    }

    const mediaUrl = buildPublicMediaUrl(objectPath);
    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Storage is not configured." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      mediaType,
      mediaUrl,
      path: objectPath,
    });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(
      { error: clientError.message, code: clientError.code },
      { status: clientError.status }
    );
  }
}
