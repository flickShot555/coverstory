import { NextResponse, type NextRequest } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";
import {
  buildExcuseUserPrompt,
  EXCUSE_SYSTEM_PROMPT,
  type ExcuseCategory,
  type ExcuseRequest,
} from "@/lib/excusePrompt";

// In-memory rate limiting requires a persistent module scope, so pin to the
// Node.js runtime (not Edge). NOTE: this is per-instance and resets on redeploy —
// a basic guard only, replaced by a shared store in Layer 7.
export const runtime = "nodejs";

const RATE_LIMIT = 5; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const requestLog = new Map<string, number[]>();

const FALLBACK_MESSAGE =
  "Couldn't come up with a good cover story right now — give it another try in a moment.";

const VALID_CATEGORIES: ExcuseCategory[] = [
  "work",
  "social",
  "family",
  "date",
  "other",
];

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Returns true if the IP is within its quota (and records this request). */
function underRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT) {
    requestLog.set(ip, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return true;
}

/** Narrow unknown JSON into a valid ExcuseRequest, or return an error string. */
function parseRequest(body: unknown): ExcuseRequest | string {
  if (typeof body !== "object" || body === null) return "Body must be an object.";
  const b = body as Record<string, unknown>;

  if (!VALID_CATEGORIES.includes(b.category as ExcuseCategory)) {
    return "Invalid or missing 'category'.";
  }

  const weather = b.weather as Record<string, unknown> | undefined;
  if (
    !weather ||
    typeof weather.tempC !== "number" ||
    typeof weather.condition !== "string" ||
    typeof weather.isDay !== "boolean" ||
    typeof weather.windSpeed !== "number"
  ) {
    return "Invalid or missing 'weather'.";
  }

  const location = b.location as Record<string, unknown> | undefined;
  if (
    !location ||
    typeof location.city !== "string" ||
    typeof location.country !== "string"
  ) {
    return "Invalid or missing 'location'.";
  }

  const timeContext = b.timeContext as Record<string, unknown> | undefined;
  if (
    !timeContext ||
    typeof timeContext.hour !== "number" ||
    typeof timeContext.dayOfWeek !== "string" ||
    typeof timeContext.isWeekend !== "boolean"
  ) {
    return "Invalid or missing 'timeContext'.";
  }

  const userContextRaw = b.userContext as Record<string, unknown> | undefined;
  const userContext = userContextRaw
    ? {
        name:
          typeof userContextRaw.name === "string"
            ? userContextRaw.name
            : undefined,
        dob:
          typeof userContextRaw.dob === "string"
            ? userContextRaw.dob
            : undefined,
      }
    : undefined;

  return {
    category: b.category as ExcuseCategory,
    details: typeof b.details === "string" ? b.details : undefined,
    weather: {
      tempC: weather.tempC,
      condition: weather.condition,
      isDay: weather.isDay,
      windSpeed: weather.windSpeed,
    },
    location: {
      city: location.city,
      country: location.country,
    },
    timeContext: {
      hour: timeContext.hour,
      dayOfWeek: timeContext.dayOfWeek,
      isWeekend: timeContext.isWeekend,
    },
    userContext,
  };
}

export async function POST(req: NextRequest) {
  // Rate limit first, before doing any work.
  const ip = clientIp(req);
  if (!underRateLimit(ip)) {
    return NextResponse.json(
      { error: "You're generating excuses a little fast — take a breather and try again in a minute." },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRequest(json);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    const excuse = await groqChat([
      { role: "system", content: EXCUSE_SYSTEM_PROMPT },
      { role: "user", content: buildExcuseUserPrompt(parsed) },
    ]);
    return NextResponse.json({ excuse });
  } catch (err) {
    const status = err instanceof GroqError ? err.status : 500;
    // Log the real error server-side; return only a friendly message.
    console.error("Excuse generation failed:", err);
    if (status === 429) {
      return NextResponse.json(
        { error: "The excuse service is busy right now — try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: FALLBACK_MESSAGE }, { status: 500 });
  }
}
