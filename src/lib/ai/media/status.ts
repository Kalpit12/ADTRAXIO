import type { GenerationStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<GenerationStatus, GenerationStatus[]> = {
  queued: ["processing", "cancelled", "failed"],
  processing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionStatus(
  from: GenerationStatus,
  to: GenerationStatus
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertStatusTransition(
  from: GenerationStatus,
  to: GenerationStatus
): void {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}
