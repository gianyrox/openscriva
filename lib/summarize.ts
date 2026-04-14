import { getItem, setItem } from "@/lib/storage";

export async function generateSummary(
  content: string,
  anthropicKey: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Summarize the following text concisely in about 700 tokens. Preserve key facts, character details, and plot points:\n\n${content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const block = data.content?.[0];
  if (block && block.type === "text") {
    return block.text;
  }

  throw new Error("Unexpected response format from Anthropic API");
}

export function getSummary(repoKey: string, filePath: string): string | null {
  return getItem<string | null>(
    `scriva:summary:${repoKey}:${filePath}`,
    null,
  );
}

export function cacheSummary(
  repoKey: string,
  filePath: string,
  summary: string,
): void {
  setItem(`scriva:summary:${repoKey}:${filePath}`, summary);
}
