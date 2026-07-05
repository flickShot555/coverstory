// Client-side fetcher for the excuse engine.
// Type-only import keeps prompt/server code out of the client bundle.

import type { ExcuseRequest } from "./excusePrompt";

export type { ExcuseRequest };

export type GenerateExcuseResult =
  | { ok: true; excuse: string }
  | { ok: false; error: string; status: number };

/**
 * POST a context payload to /api/excuse and return a typed result.
 * Never throws — network and API failures come back as { ok: false }.
 */
export async function generateExcuse(
  payload: ExcuseRequest,
  signal?: AbortSignal
): Promise<GenerateExcuseResult> {
  let res: Response;
  try {
    res = await fetch("/api/excuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Couldn't reach the server. Check your connection and try again.",
    };
  }

  let data: { excuse?: string; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.error ?? "Something went wrong generating your excuse.",
    };
  }

  if (!data?.excuse) {
    return {
      ok: false,
      status: res.status,
      error: "The server returned an empty excuse. Try again.",
    };
  }

  return { ok: true, excuse: data.excuse };
}
