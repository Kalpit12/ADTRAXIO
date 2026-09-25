import { SUPPORTED_PROPOSAL_TYPES } from "./constants";
import type { OptimizationProposalType } from "./types";

export class OptimizationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptimizationValidationError";
  }
}

export function assertSupportedProposalType(type: string): OptimizationProposalType {
  if (!SUPPORTED_PROPOSAL_TYPES.includes(type as OptimizationProposalType)) {
    throw new OptimizationValidationError(`Unsupported proposal type: ${type}`);
  }
  return type as OptimizationProposalType;
}
