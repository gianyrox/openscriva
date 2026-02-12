import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getModelId } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/keys";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = getAnthropicKey(request);

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    if (body.mode === "test") {
      const response = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Invalid API key");
      }
      return NextResponse.json({ success: true });
    }

    const validModes = ["chat", "research-prompt", "critique", "research", "revision-plan"];
    if (!validModes.includes(body.mode)) {
      return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const model: "haiku" | "sonnet" = body.model || "sonnet";
    const contexts: { type: string; content: string }[] = body.contexts || [];

    let systemPrompt = buildSystemPrompt(contexts, body.bookTitle);

    if (body.manuscriptIndex) {
      systemPrompt += "\n\n" + body.manuscriptIndex;
    }

    if (body.voiceProfile) {
      systemPrompt += "\n\n" + body.voiceProfile;
    }

    if (body.mode === "research-prompt" || body.mode === "research") {
      systemPrompt +=
        "\n\nYour current task is deep research. Provide thorough, well-sourced, detailed research on the topic. Include specific facts, data, historical context, and expert perspectives. Organize findings clearly with headers.";
    }

    if (body.mode === "critique") {
      systemPrompt +=
        "\n\nYou are providing structural critique of the writing. Focus on: pacing, character development, tension, narrative promises and payoffs, dialogue effectiveness, scene transitions, and emotional impact. Be specific with line-level feedback. Be honest but constructive.";
    }

    if (body.mode === "revision-plan") {
      systemPrompt +=
        "\n\nYou are creating a revision plan from the author's notes. Organize the notes into a prioritized, actionable plan with: 1) Critical issues to address first, 2) Chapter-by-chapter action items, 3) Suggested order of changes, 4) Estimated effort per item. Be specific and reference the author's notes directly.";
    }

    const messages: { role: "user" | "assistant"; content: string }[] =
      body.messages || [];

    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: getModelId(model),
            max_tokens: 4096,
            system: systemPrompt,
            messages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
