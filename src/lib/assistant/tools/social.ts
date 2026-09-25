import { getConnectedAccounts } from "@/lib/social/service";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function listConnectedAccountsTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const accounts = await getConnectedAccounts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  );
  return accounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    accountName: a.accountName,
    username: a.username,
    status: a.status,
    lastSyncedAt: a.lastSyncedAt,
  }));
}
