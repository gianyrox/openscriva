import Anthropic from "@anthropic-ai/sdk";
import type { ContextBriefing } from "@/types/scriva";
import { briefingToSystemPrompt } from "@/lib/contextCompiler";

export function buildSystemPrompt(
  contexts: { type: string; content: string }[],
  bookTitle?: string,
  briefing?: ContextBriefing,
): string {
  if (briefing) {
    return briefingToSystemPrompt(briefing, bookTitle || "this book");
  }

  const title = bookTitle || "this book";
  let prompt = `You are an AI writing assistant for the book '${title}'. You help with prose, structure, research, and editing. Be direct, specific, and constructive.`;

  for (const ctx of contexts) {
    prompt += `\n\n--- ${ctx.type.toUpperCase()} ---\n${ctx.content}`;
  }

  return prompt;
}

export function getModelId(model: "haiku" | "sonnet" | "opus"): string {
  if (model === "haiku") return "claude-haiku-4-5";
  if (model === "opus") return "claude-opus-4";
  return "claude-sonnet-4-5";
}

export async function streamChatCompletion(params: {
  apiKey: string;
  model: "haiku" | "sonnet" | "opus";
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  onChunk: (text: string) => void;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });
  let fullText = "";

  const stream = client.messages.stream({
    model: getModelId(params.model),
    max_tokens: 4096,
    system: params.systemPrompt,
    messages: params.messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      params.onChunk(event.delta.text);
    }
  }

  return fullText;
}
