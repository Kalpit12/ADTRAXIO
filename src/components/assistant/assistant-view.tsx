"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantShell } from "@/components/assistant/assistant-shell";
import { MessageList } from "@/components/assistant/message-list";
import { fetchWorkspaceContext } from "@/lib/workspaces/client-context";
import type {
  ConversationRecord,
  MessageAttachment,
  MessageRecord,
  PendingActionRecord,
} from "@/lib/assistant/types";

export function AssistantView() {
  const searchParams = useSearchParams();
  const initialPromptHandled = useRef(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceLabel, setWorkspaceLabel] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<
    Record<string, PendingActionRecord>
  >({});
  const [statusByMessage, setStatusByMessage] = useState<
    Record<string, string[]>
  >({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null
  );
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch("/api/assistant/conversations");
      const payload = (await response.json()) as {
        conversations?: ConversationRecord[];
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to load conversations.");
        return;
      }
      setConversations(payload.conversations ?? []);
    } catch {
      setError("Unable to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const response = await fetch(`/api/assistant/conversations/${id}`);
      const payload = (await response.json()) as {
        messages?: MessageRecord[];
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to load conversation.");
        return;
      }
      setMessages(payload.messages ?? []);
    } catch {
      setError("Unable to load conversation.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    void fetchWorkspaceContext().then((result) => {
      if (result.workspace) {
        const label = result.workspace.clientWorkspace?.name
          ? result.workspace.clientWorkspace.name
          : result.workspace.isAgency
            ? "Agency workspace"
            : "Workspace";
        setWorkspaceLabel(label);
      }
    });
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function handleNewConversation() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setSidebarOpen(false);
  }

  async function handleSelectConversation(id: string) {
    setActiveId(id);
    await loadConversation(id);
  }

  async function handleDeleteConversation(id: string) {
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setError("Unable to delete conversation.");
    }
  }

  const sendMessage = useCallback(
    async (text: string, files: File[] = []) => {
      const trimmed = text.trim();
      if ((!trimmed && files.length === 0) || sending) return;

      setSending(true);
      setError(null);
      setLastFailedMessage(null);

      const optimisticAttachments: MessageAttachment[] = files.map((file, index) => ({
        id: `temp-att-${index}`,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        type: file.type.startsWith("image/") ? "image" : "file",
        url: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : "",
      }));

      const optimisticUser: MessageRecord = {
        id: `temp-${Date.now()}`,
        conversationId: activeId ?? "",
        role: "user",
        content: trimmed,
        attachments: optimisticAttachments.length > 0 ? optimisticAttachments : null,
        toolCalls: null,
        toolResults: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      abortRef.current = new AbortController();

      try {
        const uploadedAttachments: MessageAttachment[] = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadResponse = await fetch("/api/assistant/upload", {
            method: "POST",
            body: formData,
            signal: abortRef.current.signal,
          });
          const uploadPayload = (await uploadResponse.json()) as {
            attachment?: MessageAttachment;
            error?: string;
          };
          if (!uploadResponse.ok || !uploadPayload.attachment) {
            setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
            setLastFailedMessage(trimmed);
            setError(uploadPayload.error ?? "Unable to upload attachment.");
            return;
          }
          uploadedAttachments.push(uploadPayload.attachment);
        }

        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeId,
            message: trimmed,
            attachments: uploadedAttachments,
          }),
          signal: abortRef.current.signal,
        });

        const payload = (await response.json()) as {
          conversationId?: string;
          message?: MessageRecord;
          pendingAction?: PendingActionRecord | null;
          statusUpdates?: string[];
          error?: string;
          code?: string;
        };

        if (!response.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
          setLastFailedMessage(trimmed);
          if (payload.code === "PLAN_LIMIT") {
            setError(
              payload.error ??
                "You've reached your AI generation limit. Upgrade to continue."
            );
          } else {
            setError(payload.error ?? "Unable to send message.");
          }
          return;
        }

        if (payload.conversationId) {
          setActiveId(payload.conversationId);
          void loadConversations();
        }

        if (payload.message) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== optimisticUser.id);
            return [...withoutTemp, optimisticUser, payload.message!];
          });

          if (payload.pendingAction && payload.message) {
            setPendingActions((prev) => ({
              ...prev,
              [payload.message!.id]: payload.pendingAction!,
            }));
          }

          if (payload.statusUpdates?.length && payload.message) {
            setStatusByMessage((prev) => ({
              ...prev,
              [payload.message!.id]: payload.statusUpdates!,
            }));
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Generation stopped.");
        } else {
          setError("Unable to send message.");
        }
        setLastFailedMessage(trimmed);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [activeId, sending, loadConversations]
  );

  useEffect(() => {
    if (initialPromptHandled.current) return;
    const reportId = searchParams.get("reportId")?.trim();
    const prompt = searchParams.get("prompt")?.trim();
    const shouldSend = searchParams.get("send") === "1";
    if (!shouldSend) return;
    const basePrompt =
      prompt ||
      (reportId
        ? "Explain this report using real report data."
        : "");
    if (!basePrompt && !reportId) return;
    const fullPrompt = reportId
      ? `${basePrompt}\n\nUse get_report_context for reportId: ${reportId} before answering. Structure: REPORT SUMMARY, What happened, KEY CHANGES, WHAT DROVE PERFORMANCE, WHAT NEEDS ATTENTION, RECOMMENDED ACTIONS.`
      : basePrompt;
    initialPromptHandled.current = true;
    void sendMessage(fullPrompt);
  }, [searchParams, sendMessage]);

  function handleSend({ text, files }: { text: string; files: File[] }) {
    setInput("");
    void sendMessage(text, files);
  }

  function handleSelectPrompt(prompt: string) {
    void sendMessage(prompt);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleRetry() {
    if (lastFailedMessage) {
      void sendMessage(lastFailedMessage);
    }
  }

  async function handleConfirmAction(actionId: string, messageId: string) {
    setConfirmingId(actionId);
    setError(null);
    try {
      const response = await fetch(
        `/api/assistant/actions/${actionId}/confirm`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Action failed.");
        return;
      }
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          conversationId: activeId ?? "",
          role: "assistant",
          content: "Action completed successfully.",
          attachments: null,
          toolCalls: null,
          toolResults: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setError("Unable to confirm action.");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleCancelAction(actionId: string, messageId: string) {
    try {
      await fetch(`/api/assistant/actions/${actionId}/cancel`, {
        method: "POST",
      });
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    } catch {
      setError("Unable to cancel action.");
    }
  }

  return (
    <AssistantShell
      conversations={conversations}
      activeId={activeId}
      loadingConversations={loadingConversations}
      workspaceLabel={workspaceLabel}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
    >
      <MessageList
        messages={messages}
        loading={loadingMessages}
        sending={sending}
        error={error}
        onRetry={lastFailedMessage ? handleRetry : undefined}
        onSelectPrompt={handleSelectPrompt}
        workspaceLabel={workspaceLabel}
        onFollowUp={handleSelectPrompt}
        pendingActions={pendingActions}
        statusByMessage={statusByMessage}
        confirmingId={confirmingId}
        onConfirmAction={handleConfirmAction}
        onCancelAction={handleCancelAction}
        bottomRef={bottomRef}
      />
      <AssistantComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        loading={sending}
      />
    </AssistantShell>
  );
}
