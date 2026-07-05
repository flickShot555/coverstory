import { NextResponse, type NextRequest } from "next/server";
import { groqChat, GroqError } from "@/lib/groq";
import { rateLimit } from "@/lib/rateLimit";
import {
  buildExcuseUserPrompt,
  EXCUSE_SYSTEM_PROMPT,
  type ExcuseCategory,
  type ExcuseRequest,
} from "@/lib/excusePrompt";

// In-memory rate limiting requires a persistent module scope, so pin to Node.js.
export const runtime = "nodejs";

const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const MAX_DETAILS_LENGTH = 500;

const FALLBACK_MESSAGE =
  "Couldn't come up with a good cover story right now — give it another try in a moment.";
const RATE_LIMIT_MESSAGE =
  "Too many requests. Please wait a moment before generating another excuse.";

const VALID_CATEGORIES: ExcuseCategory[] = [
  "work",
  "social",
  "family",
  "date",
  "other",
];

/** Vercel sets x-forwarded-for reliably; take the first (client) address. */
function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Strip HTML/script tags and collapse whitespace — basic XSS prevention. */
function sanitizeDetails(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // remove tags
    .replace(/[<>]/g, "") // remove stray angle brackets
    .replace(/\s+/g, " ")
    .trim();
}

/** Narrow unknown JSON into a valid ExcuseRequest, or return an error string. */
function parseRequest(body: unknown): ExcuseRequest | string {
  if (typeof body !== "object" || body === null) return "Body must be an object.";
  const b = body as Record<string, unknown>;

  if (
    typeof b.category !== "string" ||
    !VALID_CATEGORIES.includes(b.category as ExcuseCategory)
  ) {
    return "Invalid or missing 'category'.";
  }

  let details: string | undefined;
  if (b.details !== undefined) {
    if (typeof b.details !== "string") return "'details' must be a string.";
    if (b.details.length > MAX_DETAILS_LENGTH) {
      return `'details' must be ${MAX_DETAILS_LENGTH} characters or fewer.`;
    }
    const cleaned = sanitizeDetails(b.details);
    details = cleaned.length ? cleaned : undefined;
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
    details,
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
  const limit = rateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limit.resetMs / 1000)) },
      }
    );
  }

  // Require a JSON content type.
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415 }
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
    // Log only a status/type server-side; never echo request/response bodies.
    const status = err instanceof GroqError ? err.status : 500;
    console.error(`Excuse generation failed (status ${status}).`);
    if (status === 429) {
      return NextResponse.json(
        { error: "The excuse service is busy right now — try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: FALLBACK_MESSAGE }, { status: 500 });
  }
}
