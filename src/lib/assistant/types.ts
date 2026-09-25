import type { WorkspaceScope } from "@/lib/workspaces/scope";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AssistantMessageRole = "user" | "assistant" | "tool" | "system";

export type ToolRiskLevel = "read" | "write" | "external";

export type PendingActionType =
  | "publish_post"
  | "schedule_post"
  | "cancel_post"
  | "retry_post"
  | "create_campaign"
  | "delete_content"
  | "save_brand_memory"
  | "execute_optimization"
  | "rollback_optimization";

export type PendingActionStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired";

export interface AssistantContext {
  supabase: SupabaseClient;
  user: User;
  organizationId: string;
  scope: WorkspaceScope;
  clientWorkspaceId: string | null;
  isAgency: boolean;
  clientName: string | null;
  clientRole: import("@/lib/workspaces/types").ClientRole | null;
  orgRole: string | null;
}

export interface ConversationRecord {
  id: string;
  organizationId: string;
  clientWorkspaceId: string | null;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  type: "image" | "file";
  url: string;
  path?: string;
  extractedText?: string | null;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  attachments: MessageAttachment[] | null;
  toolCalls: unknown | null;
  toolResults: unknown | null;
  createdAt: string;
}

export interface PendingActionRecord {
  id: string;
  conversationId: string;
  actionType: PendingActionType;
  payload: Record<string, unknown>;
  summary: string;
  status: PendingActionStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: ToolRiskLevel;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: unknown;
  statusMessage?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: MessageRecord;
  pendingAction?: PendingActionRecord | null;
  statusUpdates?: string[];
}

export interface BusinessContextSummary {
  organizationName: string | null;
  industry: string | null;
  description: string | null;
  goals: string[];
}

export interface WorkspaceContextSummary {
  workspaceType: "business" | "creator" | "agency" | "agency_client";
  selectedClient: string | null;
  connectedPlatforms: string[];
  plan: string;
  hasClientSelected: boolean;
  business: BusinessContextSummary | null;
}

export type DateRangePreset = "7d" | "30d" | "90d";
