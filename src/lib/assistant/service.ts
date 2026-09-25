import { checkLimit } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { recordUsageEvent } from "@/lib/billing/service";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import { clientWorkspaceInsertValue } from "@/lib/workspaces/scope";
import {
  assistantContextFromAuth,
  buildWorkspaceContextSummary,
} from "./context";
import { confirmPendingAction, cancelPendingAction } from "./confirmations";
import { buildSystemPrompt } from "./prompts";
import { formatBrandContextForPromptFromBrain } from "./brand-context";
import { buildUserMessageContent, parseMessageAttachments } from "./attachments";
import {
  selectConversationMessages,
  summarizeOlderConversation,
} from "./conversation-history";
import { runAssistantCompletion, AssistantAIError } from "./openai";
import { AssistantPermissionError } from "./permissions";
import type {
  AssistantContext,
  ChatResponse,
  ConversationRecord,
  MessageAttachment,
  MessageRecord,
  PendingActionRecord,
} from "./types";

function mapConversation(row: {
  id: string;
  organization_id: string;
  client_workspace_id: string | null;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}): ConversationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientWorkspaceId: row.client_workspace_id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  attachments?: unknown;
  tool_calls: unknown;
  tool_results: unknown;
  created_at: string;
}): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRecord["role"],
    content: row.content,
    attachments: (() => {
      const parsed = parseMessageAttachments(row.attachments);
      return parsed.length > 0 ? parsed : null;
    })(),
    toolCalls: row.tool_calls,
    toolResults: row.tool_results,
    createdAt: row.created_at,
  };
}

async function enforceRateLimit(ctx: AssistantContext): Promise<void> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", hourAgo)
    .in(
      "conversation_id",
      (
        await ctx.supabase
          .from("ai_conversations")
          .select("id")
          .eq("user_id", ctx.user.id)
      ).data?.map((c) => c.id) ?? []
    );

  if ((count ?? 0) >= 60) {
    throw new AssistantAIError(
      "You've sent too many messages. Please wait before trying again."
    );
  }
}

async function enforceBilling(ctx: AssistantContext): Promise<void> {
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  ).toISOString();

  const { count } = await ctx.supabase
    .from("billing_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("metric", "ai_generation")
    .gte("created_at", monthStart);

  await checkLimit(
    ctx.supabase,
    ctx.organizationId,
    "ai_generation",
    count ?? 0
  );
}

export async function listConversations(
  ctx: AssistantContext
): Promise<ConversationRecord[]> {
  const { data, error } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapConversation);
}

export async function createConversation(
  ctx: AssistantContext,
  workspace: WorkspaceContext,
  title?: string
): Promise<ConversationRecord> {
  const { data, error } = await ctx.supabase
    .from("ai_conversations")
    .insert({
      organization_id: ctx.organizationId,
      client_workspace_id: clientWorkspaceInsertValue(workspace),
      user_id: ctx.user.id,
      title: title?.trim() || "New conversation",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new AssistantAIError(
        "Assistant is not fully set up yet. Apply database migration 023_ai_assistant."
      );
    }
    throw new Error(error.message);
  }
  return mapConversation(data);
}

export async function getConversation(
  ctx: AssistantContext,
  conversationId: string
): Promise<{ conversation: ConversationRecord; messages: MessageRecord[] } | null> {
  const { data: conversation, error } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  if (!conversation) return null;

  const { data: messages, error: msgError } = await ctx.supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) {
    if (msgError.code === "42P01") {
      return {
        conversation: mapConversation(conversation),
        messages: [],
      };
    }
    throw new Error(msgError.message);
  }

  return {
    conversation: mapConversation(conversation),
    messages: (messages ?? []).map(mapMessage),
  };
}

export async function deleteConversation(
  ctx: AssistantContext,
  conversationId: string
): Promise<void> {
  const { error } = await ctx.supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organizationId);

  if (error) throw new Error(error.message);
}

function deriveTitle(message: string, attachments?: MessageAttachment[]): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed) {
    if (trimmed.length <= 48) return trimmed;
    return `${trimmed.slice(0, 45)}...`;
  }
  if (attachments?.length) {
    const first = attachments[0];
    if (first.type === "image") return "Image analysis";
    const name = first.name.replace(/\.[^.]+$/, "");
    if (name.length <= 48) return name;
    return `${name.slice(0, 45)}...`;
  }
  return "New conversation";
}

export async function handleChat(
  auth: Parameters<typeof assistantContextFromAuth>[0] & {
    workspace: WorkspaceContext;
  },
  input: {
    conversationId?: string;
    message: string;
    attachments?: MessageAttachment[];
  }
): Promise<ChatResponse> {
  const ctx = assistantContextFromAuth(auth);
  const message = input.message?.trim() ?? "";
  const attachments = input.attachments ?? [];
  if (!message && attachments.length === 0) {
    throw new AssistantAIError("Message or attachment is required.");
  }
  if (attachments.length > 5) {
    throw new AssistantAIError("You can attach up to 5 files per message.");
  }

  await enforceRateLimit(ctx);
  await enforceBilling(ctx);

  let conversationId = input.conversationId;
  let conversation: ConversationRecord;

  if (conversationId) {
    const existing = await getConversation(ctx, conversationId);
    if (!existing) {
      throw new AssistantAIError("Conversation not found.");
    }
    conversation = existing.conversation;
  } else {
    conversation = await createConversation(
      ctx,
      auth.workspace,
      deriveTitle(message, attachments)
    );
    conversationId = conversation.id;
  }

  const { error: userMsgError } = await ctx.supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message,
    attachments: attachments.length > 0 ? attachments : null,
  });
  if (userMsgError) throw new Error(userMsgError.message);

  const history = await getConversation(ctx, conversationId);
  const allMessages =
    history?.messages.filter((m) => m.role === "user" || m.role === "assistant") ??
    [];
  const recentMessages = selectConversationMessages(allMessages);
  const conversationSummary = summarizeOlderConversation(allMessages);

  const workspaceSummary = await buildWorkspaceContextSummary(ctx);
  const brandContextText = await formatBrandContextForPromptFromBrain(ctx, {
    mode: "generation",
  });
  const systemPrompt = buildSystemPrompt(workspaceSummary, {
    conversationSummary,
    brandContextText,
  });

  const statusUpdates: string[] = [];
  const { content, toolCalls } = await runAssistantCompletion({
    ctx,
    systemPrompt,
    conversationId,
    messages: recentMessages.map((m) => {
      if (m.role === "user" && m.attachments?.length) {
        return {
          role: "user" as const,
          content: buildUserMessageContent(m.content, m.attachments),
        };
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      };
    }),
    onStatus: (status) => statusUpdates.push(status),
  });

  let pendingAction: PendingActionRecord | null = null;
  for (const call of toolCalls) {
    const result = call.result as Record<string, unknown> | null;
    if (
      result &&
      typeof result === "object" &&
      typeof result.id === "string" &&
      typeof result.actionType === "string" &&
      typeof result.summary === "string"
    ) {
      pendingAction = result as unknown as PendingActionRecord;
    }
  }

  const { data: assistantRow, error: assistantError } = await ctx.supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : null,
    })
    .select("*")
    .single();

  if (assistantError) throw new Error(assistantError.message);

  if (conversation.title === "New conversation") {
    await ctx.supabase
      .from("ai_conversations")
      .update({ title: deriveTitle(message, attachments) })
      .eq("id", conversationId);
  } else {
    await ctx.supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  await recordUsageEvent(ctx.organizationId, "ai_generation");

  return {
    conversationId,
    message: mapMessage(assistantRow),
    pendingAction,
    statusUpdates,
  };
}

export async function handleConfirmAction(
  auth: Parameters<typeof assistantContextFromAuth>[0],
  actionId: string
) {
  const ctx = assistantContextFromAuth(auth);
  return confirmPendingAction(ctx, actionId);
}

export async function handleCancelAction(
  auth: Parameters<typeof assistantContextFromAuth>[0],
  actionId: string
) {
  const ctx = assistantContextFromAuth(auth);
  await cancelPendingAction(ctx, actionId);
}

export {
  AssistantAIError,
  AssistantPermissionError,
  EntitlementError,
  assistantContextFromAuth,
};
