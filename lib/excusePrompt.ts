// Prompt construction for the Coverstory excuse engine.
// Pure functions + shared types — safe to import types from the client
// (use `import type`), no secrets here.

export type ExcuseCategory = "work" | "social" | "family" | "date" | "other";

export interface ExcuseRequest {
  category: ExcuseCategory;
  details?: string;
  weather: {
    tempC: number;
    condition: string;
    isDay: boolean;
    windSpeed: number;
  };
  location: {
    city: string;
    country: string;
  };
  timeContext: {
    hour: number; // 0–23
    dayOfWeek: string; // e.g. "Monday"
    isWeekend: boolean;
  };
  userContext?: {
    name?: string; // first name only
    dob?: string; // used to infer age group; never sent verbatim
  };
}

export interface ExcuseResponse {
  excuse: string;
}

/** Per-category tone guidance injected into the prompt. */
const CATEGORY_TONE: Record<ExcuseCategory, string> = {
  work: "This is for work. Keep it professional and apologetic — the kind of message you'd send a manager or colleague. Show accountability without grovelling.",
  social:
    "This is for a social plan with friends. Keep it casual and relaxed, a little self-deprecating is fine.",
  family:
    "This is for family. Keep it warm and affectionate, the tone of someone who genuinely wishes they could be there.",
  date: "This is for a date. Keep it casual but considerate — disappointed to miss it, not cold, and not over-explaining.",
  other:
    "Keep the tone natural and neutral, adapting to whatever the details suggest.",
};

/** Turn an ISO date of birth into a coarse age group (no raw DoB leaves here). */
export function ageGroupFromDob(dob?: string): string | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;

  if (age < 20) return "teenager";
  if (age < 30) return "in their twenties";
  if (age < 40) return "in their thirties";
  if (age < 50) return "in their forties";
  if (age < 65) return "in their fifties or sixties";
  return "a senior";
}

/** Describe the time of day in human terms for the prompt. */
function partOfDay(hour: number): string {
  if (hour < 5) return "the middle of the night";
  if (hour < 12) return "the morning";
  if (hour < 17) return "the afternoon";
  if (hour < 21) return "the evening";
  return "late at night";
}

export const EXCUSE_SYSTEM_PROMPT = `You are Coverstory, a witty, deadpan excuse generator.

Your job: write a single believable excuse for why someone can't make it to something. The excuse must:
- Sound natural, human, and locally believable — like a real text message from a real person. It must NOT sound AI-generated, generic, or over-polished.
- Be grounded in the specific weather, place, time, and situation you're given. Lean on hyperlocal, mundane, oddly specific details (a jammed gate, a delayed tram, a neighbour's flooded balcony) rather than grand dramatic events.
- Be 2 to 4 sentences. No more.
- NEVER start with the word "I". Vary your opening every time.
- Include a brief apology or sign-off that fits the tone.
- Be plausible: no wild, unverifiable, or over-the-top claims. Keep it small and real.

Output ONLY the excuse text. No preamble, no quotation marks, no explanation, no options.`;

/** Build the user prompt injecting all situational context. */
export function buildExcuseUserPrompt(req: ExcuseRequest): string {
  const { category, details, weather, location, timeContext, userContext } = req;

  const lines: string[] = [];
  lines.push(`Situation: You need an excuse for a ${category} commitment.`);
  lines.push("");
  lines.push("Context:");
  lines.push(`- Place: ${location.city}, ${location.country}`);
  lines.push(
    `- Weather: ${Math.round(weather.tempC)}°C, ${weather.condition}, ${
      weather.isDay ? "daytime" : "nighttime"
    }, wind around ${Math.round(weather.windSpeed)} km/h`
  );
  lines.push(
    `- Time: ${partOfDay(timeContext.hour)} on ${timeContext.dayOfWeek}${
      timeContext.isWeekend ? " (a weekend)" : " (a weekday)"
    }`
  );

  const ageGroup = ageGroupFromDob(userContext?.dob);
  if (userContext?.name) {
    lines.push(`- From: ${userContext.name}${ageGroup ? `, ${ageGroup}` : ""}`);
  } else if (ageGroup) {
    lines.push(`- The person is ${ageGroup}`);
  }

  if (details && details.trim()) {
    lines.push(`- Extra details from the user: ${details.trim()}`);
  }

  lines.push("");
  lines.push(`Tone: ${CATEGORY_TONE[category]}`);
  lines.push("");
  lines.push(
    "Write the excuse now. Make it feel like it could only have come from this exact place, time, and weather."
  );

  return lines.join("\n");
}
