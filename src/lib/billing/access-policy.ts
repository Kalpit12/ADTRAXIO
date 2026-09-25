import type { PlanId } from "./types";

export function hasPaidAccess(status: string, periodEnd: string | null): boolean {
  if (status === "active" || status === "trialing") return true;
  if (status === "past_due") return true;
  if (status === "canceled" && periodEnd) {
    return new Date(periodEnd) > new Date();
  }
  return false;
}

export function resolveEffectivePlan(
  storedPlan: PlanId,
  status: string,
  periodEnd: string | null
): PlanId {
  if (storedPlan === "free") return "free";
  return hasPaidAccess(status, periodEnd) ? storedPlan : "free";
}
