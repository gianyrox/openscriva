import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getModelId } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "@/lib/keys";

function buildChapterReviewPrompt(): string {
  return `You are a professional book editor providing a structured chapter critique.

Analyze the chapter and provide feedback in the following markdown structure:

## Strengths
- List specific strengths with brief quotes from the text

## Weaknesses
- List specific weaknesses with brief quotes from the text

## Pacing
Evaluate the chapter's pacing. Note any sections that drag or rush.

## Prose Quality
Assess clarity, rhythm, word choice, and sentence variety.

## Suggestions
For each suggestion, reference a specific passage:
1. **[passage quote or location]** — suggestion for improvement
2. **[passage quote or location]** — suggestion for improvement

Be direct, constructive, and specific. Reference actual text from the chapter.`;
}

function buildContinuityPrompt(): string {
  return `You are a continuity editor checking for cross-chapter consistency.

Analyze the provided chapters and check for:

## Character Consistency
Note any inconsistencies in character behavior, appearance, knowledge, or voice across chapters.

## Timeline
Check for temporal inconsistencies, impossible sequences, or unclear time progression.

## Tone Shifts
Identify jarring tonal shifts that seem unintentional.

## Dropped Threads
Note any plot threads, questions, or setups introduced but not followed up on.

## Contradictions
List any factual contradictions between chapters.

For each issue, cite the specific chapters and passages involved. Be thorough but prioritize significant issues.`;
}

function buildReadinessPrompt(): string {
  return `You are assessing a manuscript's publish readiness.

Provide scores from 1-10 for each category, with brief justification:

## Per-Chapter Scores

For each chapter, provide:
| Category | Score | Notes |
|----------|-------|-------|
| Grammar | X/10 | brief note |
| Pacing | X/10 | brief note |
| Character Development | X/10 | brief note |
| Prose Quality | X/10 | brief note |
| Coherence | X/10 | brief note |

## Overall Scores

| Category | Score | Notes |
|----------|-------|-------|
| Grammar | X/10 | |
| Pacing | X/10 | |
| Character Development | X/10 | |
| Prose Quality | X/10 | |
| Coherence | X/10 | |
| Completeness | X/10 | vs outline if provided |

## Overall Assessment
Brief paragraph on the manuscript's readiness.

## Actionable Next Steps
Numbered list of specific, prioritized actions the author should take before publishing.

Be honest but constructive. Scores should reflect genuine quality assessment.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = getAnthropicKey(request);

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const model: "haiku" | "sonnet" = body.model || "sonnet";
    const contexts: { type: string; content: string }[] = body.contexts || [];
    const mode: string = body.mode;

    if (!mode || !["chapter", "continuity", "readiness"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    if (!body.text && mode === "chapter") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    let systemPrompt: string;

    if (mode === "chapter") {
      systemPrompt = buildChapterReviewPrompt();
    } else if (mode === "continuity") {
      systemPrompt = buildContinuityPrompt();
    } else {
      systemPrompt = buildReadinessPrompt();
    }

    if (contexts.length > 0) {
      const contextBlock = buildSystemPrompt(contexts, body.bookTitle);
      systemPrompt += "\n\n" + contextBlock;
    }

    let userMessage: string;

    if (mode === "chapter") {
      userMessage = "Review this chapter:\n\n" + body.text;
    } else if (mode === "continuity") {
      let chaptersText = "";
      if (body.text) {
        chaptersText = body.text;
      }
      for (const ctx of contexts) {
        if (ctx.type === "chapter") {
          chaptersText += "\n\n---\n\n" + ctx.content;
        }
      }
      userMessage = "Check continuity across these chapters:\n\n" + chaptersText;
    } else {
      let manuscriptText = "";
      if (body.text) {
        manuscriptText = body.text;
      }
      for (const ctx of contexts) {
        if (ctx.type === "chapter") {
          manuscriptText += "\n\n---\n\n" + ctx.content;
        }
      }
      userMessage = "Assess publish readiness for this manuscript:\n\n" + manuscriptText;
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: getModelId(model),
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const result =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
