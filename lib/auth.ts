import { NextRequest, NextResponse } from "next/server";
import { getAnthropicKey } from "./keys";

/**
 * Rate limit configuration (headers only for now — enforcement TBD).
 */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60; // seconds

function rateLimitHeaders(): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(RATE_LIMIT_MAX), // placeholder until enforcement
    "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW),
  };
}

export type AuthResult =
  | { ok: true; apiKey: string }
  | { ok: false; response: NextResponse };

/**
 * Require a user-provided Anthropic API key for the request.
 *
 * Returns the key if present, or a 401 NextResponse if not.
 * Attaches rate-limit headers to error responses automatically.
 *
 * Usage:
 *   const auth = await requireAuthKey(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.apiKey is now available
 */
export async function requireAuthKey(request: NextRequest): Promise<AuthResult> {
  const apiKey = await getAnthropicKey(request);

  if (!apiKey) {
    const response = NextResponse.json(
      {
        error: "API key required. Set up your key in Settings.",
        code: "MISSING_API_KEY",
      },
      { status: 401 },
    );
    for (const [k, v] of Object.entries(rateLimitHeaders())) {
      response.headers.set(k, v);
    }
    return { ok: false, response };
  }

  return { ok: true, apiKey };
}

/**
 * Append rate-limit headers to an outgoing response.
 * Call this before returning successful responses from /api/ai/* routes.
 */
export function withRateLimitHeaders(response: Response | NextResponse): Response | NextResponse {
  for (const [k, v] of Object.entries(rateLimitHeaders())) {
    response.headers.set(k, v);
  }
  return response;
}
