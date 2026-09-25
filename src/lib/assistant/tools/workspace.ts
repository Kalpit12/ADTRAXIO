import { buildWorkspaceContextSummary } from "../context";
import type { AssistantContext } from "../types";

export async function getWorkspaceContextTool(ctx: AssistantContext) {
  return buildWorkspaceContextSummary(ctx);
}
