import type { MessageRecord } from "./types";

const MAX_RECENT_MESSAGES = 18;
const SUMMARY_TRIGGER = 22;

export function summarizeOlderConversation(
  messages: MessageRecord[]
): string | null {
  if (messages.length <= SUMMARY_TRIGGER) return null;

  const older = messages.slice(0, messages.length - MAX_RECENT_MESSAGES);
  const parts: string[] = [];

  for (const message of older) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const text = message.content.trim().replace(/\s+/g, " ");
    if (!text) continue;
    const clipped = text.length > 160 ? `${text.slice(0, 157)}...` : text;
    parts.push(`${message.role === "user" ? "User" : "Assistant"}: ${clipped}`);
    if (parts.length >= 8) break;
  }

  if (parts.length === 0) return null;
  return parts.join("\n");
}

export function selectConversationMessages(
  messages: MessageRecord[]
): MessageRecord[] {
  const filtered = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  if (filtered.length <= MAX_RECENT_MESSAGES) return filtered;
  return filtered.slice(-MAX_RECENT_MESSAGES);
}
