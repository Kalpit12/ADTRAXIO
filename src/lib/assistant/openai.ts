import { isOpenAIConfigured } from "@/lib/ai/generate-content";
import {
  executeTool,
  openAIToolDefinitions,
  sanitizeToolResult,
} from "./tools";
import type { OpenAIContentPart } from "./attachments";
import type { AssistantContext, ToolCallResult } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_TOOL_ITERATIONS = 6;

export class AssistantAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantAIError";
  }
}

export { isOpenAIConfigured };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenAIContentPart[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
};

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function runAssistantCompletion(input: {
  ctx: AssistantContext;
  systemPrompt: string;
  messages: ChatMessage[];
  conversationId: string;
  onStatus?: (status: string) => void;
}): Promise<{
  content: string;
  toolCalls: ToolCallResult[];
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AssistantAIError(
      "ADTRAXIO AI is temporarily unavailable. Please try again later."
    );
  }

  const workingMessages: ChatMessage[] = [
    { role: "system", content: input.systemPrompt },
    ...input.messages,
  ];

  const toolResults: ToolCallResult[] = [];
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
          temperature: 0.4,
          messages: workingMessages,
          tools: openAIToolDefinitions(),
          tool_choice: "auto",
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AssistantAIError("Request timed out. Please try again.");
      }
      throw new AssistantAIError(
        "ADTRAXIO AI is temporarily unavailable. Please try again later."
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new AssistantAIError(
        "ADTRAXIO AI is temporarily unavailable. Please try again later."
      );
    }

    const payload = (await response.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: OpenAIToolCall[];
        };
      }[];
    };

    const choice = payload.choices?.[0]?.message;
    if (!choice) {
      throw new AssistantAIError("AI returned an empty response.");
    }

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      workingMessages.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: choice.tool_calls,
      });

      for (const call of choice.tool_calls) {
        const name = call.function.name;
        input.onStatus?.(`Running: ${name.replaceAll("_", " ")}...`);

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }

        const raw = await executeTool(input.ctx, name, args, {
          conversationId: input.conversationId,
        });
        const result = sanitizeToolResult(raw);

        toolResults.push({
          toolCallId: call.id,
          name,
          result,
        });

        workingMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name,
          content: JSON.stringify(result),
        });
      }

      continue;
    }

    const content = choice.content?.trim();
    if (!content) {
      throw new AssistantAIError("AI returned an empty response.");
    }

    return { content, toolCalls: toolResults };
  }

  throw new AssistantAIError(
    "The assistant needed too many steps. Please simplify your request."
  );
}
