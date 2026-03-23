import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getModelId } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuthKey, withRateLimitHeaders } from "@/lib/auth";
import { isDemoRequest, getDemoEditResponse } from "@/lib/demo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (isDemoRequest(body)) {
      const demo = getDemoEditResponse();
      return withRateLimitHeaders(NextResponse.json(demo));
    }

    const auth = await requireAuthKey(request);
    if (!auth.ok) return auth.response;
    const apiKey = auth.apiKey;

    const model: "haiku" | "sonnet" | "opus" = body.model || "sonnet";
    const contexts: { type: string; content: string }[] = body.contexts || [];

    let systemPrompt: string;

    if (body.mode === "cleanup") {
      systemPrompt =
        "You are polishing prose. Improve clarity, flow, and style while preserving the author's voice. Return a JSON object with two fields: \"result\" (the improved text) and \"reasoning\" (1-2 sentences explaining why you made the key changes). Return ONLY valid JSON.";
    } else {
      systemPrompt =
        "You are editing a passage from a book. Return a JSON object with two fields: \"result\" (the modified text) and \"reasoning\" (1-2 sentences explaining why you made the key changes). Return ONLY valid JSON.";
    }

    if (body.briefing) {
      systemPrompt += "\n\n" + buildSystemPrompt([], undefined, body.briefing);
    } else if (contexts.length > 0) {
      const contextBlock = buildSystemPrompt(contexts, undefined);
      systemPrompt += "\n\n" + contextBlock;
    }

    const userMessage =
      body.mode === "cleanup"
        ? `Polish the following text:\n\n${body.text}`
        : `${body.instruction}\n\nText to modify:\n\n${body.text}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: getModelId(model),
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    let result = raw;
    let reasoning = "";

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.result) {
        result = parsed.result;
        reasoning = parsed.reasoning ?? "";
      }
    } catch {
      result = raw;
    }

    return withRateLimitHeaders(NextResponse.json({ result, reasoning }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
