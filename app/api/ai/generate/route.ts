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

    const model: "haiku" | "sonnet" = body.model || "sonnet";
    const contexts: { type: string; content: string }[] = body.contexts || [];
    const client = new Anthropic({ apiKey });

    if (body.mode === "research") {
      const systemPrompt =
        "You are a thorough research assistant. Provide well-organized, detailed research synthesis with citations where possible. Structure your response with clear headings and sections.";

      const userMessage = body.instruction || body.text || "";

      const response = await client.messages.create({
        model: getModelId(model),
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const result =
        response.content[0].type === "text" ? response.content[0].text : "";

      return NextResponse.json({ result });
    }

    if (body.mode === "continue") {
      let systemPrompt = buildSystemPrompt(contexts, body.bookTitle);
      systemPrompt +=
        "\n\nContinue writing from where the text leaves off. Write 3-5 paragraphs that match the voice, tone, and style of the existing text. Return ONLY the continuation text.";

      const response = await client.messages.create({
        model: getModelId(model),
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: "Continue from this text:\n\n" + (body.text || ""),
          },
        ],
      });

      const result =
        response.content[0].type === "text" ? response.content[0].text : "";

      return NextResponse.json({ result });
    }

    if (body.mode === "draft") {
      let systemPrompt = buildSystemPrompt(contexts, body.bookTitle);
      systemPrompt +=
        "\n\nGenerate a full chapter draft based on the outline synopsis. Match the voice and style of any provided context. Include scene-setting, dialogue where appropriate, and narrative flow. Return ONLY the chapter text.";

      const instruction = body.instruction || "Write a chapter draft.";

      const response = await client.messages.create({
        model: getModelId(model),
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: instruction }],
      });

      const result =
        response.content[0].type === "text" ? response.content[0].text : "";

      return NextResponse.json({ result });
    }

    if (body.mode === "voice-guide") {
      const systemPrompt =
        "You are a literary analyst. Analyze the provided text samples and generate a comprehensive voice/style guide. Cover: tone, sentence structure patterns, vocabulary level, point of view, pacing, dialogue style, descriptive tendencies, and any distinctive habits. Be specific with examples.";

      const response = await client.messages.create({
        model: getModelId(model),
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content:
              "Analyze these text samples and create a voice/style guide:\n\n" +
              (body.text || ""),
          },
        ],
      });

      const result =
        response.content[0].type === "text" ? response.content[0].text : "";

      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Unknown mode: " + body.mode }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
