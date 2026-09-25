import type { AllocationJson, ExperimentVariantRecord } from "./types";
import { ExperimentValidationError } from "./validation";

export function validateFixedSplitAllocation(
  variants: Pick<ExperimentVariantRecord, "variantKey" | "allocationPercent">[]
): AllocationJson {
  if (variants.length < 2) {
    throw new ExperimentValidationError("An experiment requires at least two variants.");
  }
  for (const v of variants) {
    if (v.allocationPercent <= 0 || v.allocationPercent > 100) {
      throw new ExperimentValidationError(
        "Each variant allocation must be greater than 0 and at most 100."
      );
    }
  }
  const total = variants.reduce((sum, v) => sum + Number(v.allocationPercent), 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new ExperimentValidationError(
      `Allocation must total 100%. Current total: ${total}.`
    );
  }
  return {
    version: 1,
    splits: variants.map((v) => ({
      variantKey: v.variantKey,
      percent: Number(v.allocationPercent),
    })),
  };
}

export function allocationRequiresHundredPercent(status: string): boolean {
  return status === "approved" || status === "running" || status === "paused";
}
