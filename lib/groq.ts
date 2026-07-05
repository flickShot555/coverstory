// Server-only Groq API client for the Coverstory excuse engine.
// GROQ_API_KEY must never be exposed to the client — only import this from
// server code (route handlers, server actions).

import "server-only";

export const GROQ_API_KEY = process.env.GROQ_API_KEY;

/** Default model — fast, free-tier, good quality for short creative text. */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Thrown for any Groq failure; carries a status for the route to map. */
export class GroqError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

/**
 * Call Groq's OpenAI-compatible chat completions endpoint and return the
 * assistant's message text. Throws GroqError on any failure.
 */
export async function groqChat(
  messages: ChatMessage[],
  options: GroqChatOptions = {}
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new GroqError("GROQ_API_KEY is not configured on the server.", 500);
  }

  let res: Response;
  try {
    res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? GROQ_MODEL,
        messages,
        temperature: options.temperature ?? 0.9,
        max_tokens: options.maxTokens ?? 250,
      }),
      signal: options.signal,
    });
  } catch {
    throw new GroqError("Could not reach the Groq API.", 502);
  }

  if (!res.ok) {
    // Read the body for server logs, but never surface it to the client.
    const body = await res.text().catch(() => "");
    console.error(`Groq API error ${res.status}: ${body}`);
    const status = res.status === 429 ? 429 : 502;
    throw new GroqError(`Groq API returned ${res.status}.`, status);
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new GroqError("Groq API returned an empty response.", 502);
  }
  return content;
}
