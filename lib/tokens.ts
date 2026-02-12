export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 100000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.round(count / 1000)}k`;
}

export function estimateCost(
  tokens: number,
  model: "haiku" | "sonnet",
): number {
  const rates: Record<"haiku" | "sonnet", { input: number; output: number }> = {
    haiku: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    sonnet: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  };
  const rate = rates[model];
  return tokens * ((rate.input + rate.output) / 2);
}
