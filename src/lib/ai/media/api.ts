import { NextResponse } from "next/server";
import { toPublicError } from "./errors";
import type { PublicGenerationJob } from "./types";

export function jsonJobResponse(job: PublicGenerationJob, status = 202) {
  return NextResponse.json({ job }, { status });
}

export function jsonMediaError(error: unknown) {
  const pub = toPublicError(error);
  return NextResponse.json(
    { error: pub.error, category: pub.category },
    { status: pub.status }
  );
}
