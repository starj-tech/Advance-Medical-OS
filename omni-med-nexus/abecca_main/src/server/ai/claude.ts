/**
 * Env-gated Claude client (Anthropic Messages API via fetch, no SDK). When
 * ANTHROPIC_API_KEY is unset — dev/preview/CI — every call returns null fast so
 * callers transparently fall back to a deterministic local heuristic, exactly
 * like the email/WhatsApp/BPJS/SATUSEHAT integrations. The model is overridable
 * via ANTHROPIC_MODEL.
 */
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Single-turn completion. Returns the text, or null when unavailable / on error. */
export async function aiComplete(
  system: string,
  user: string,
  maxTokens = 1024,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      console.error("[ai] completion failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    console.error("[ai] completion error", e);
    return null;
  }
}

/** Completion expected to return JSON; parses the first {...} / [...] block. */
export async function aiCompleteJSON<T>(
  system: string,
  user: string,
  maxTokens = 1024,
): Promise<T | null> {
  const text = await aiComplete(
    `${system}\n\nRespond ONLY with valid minified JSON, no prose, no markdown fences.`,
    user,
    maxTokens,
  );
  if (!text) return null;
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
