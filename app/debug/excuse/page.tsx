"use client";

import { useState } from "react";
import { generateExcuse, type ExcuseRequest } from "@/lib/excuseClient";
import type { ExcuseCategory } from "@/lib/excusePrompt";

const CATEGORIES: ExcuseCategory[] = ["work", "social", "family", "date", "other"];

// Fixed test context — no geolocation/auth wiring on this debug page.
function buildPayload(category: ExcuseCategory, details: string): ExcuseRequest {
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = now.getDay();

  return {
    category,
    details: details.trim() || undefined,
    weather: {
      tempC: 9,
      condition: "rain",
      isDay: false,
      windSpeed: 34,
    },
    location: {
      city: "Manchester",
      country: "United Kingdom",
    },
    timeContext: {
      hour: now.getHours(),
      dayOfWeek: days[day],
      isWeekend: day === 0 || day === 6,
    },
    userContext: {
      name: "Alex",
      dob: "1994-05-12",
    },
  };
}

export default function ExcuseDebugPage() {
  const [category, setCategory] = useState<ExcuseCategory>("work");
  const [details, setDetails] = useState("");
  const [excuse, setExcuse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    const result = await generateExcuse(buildPayload(category, details));
    if (result.ok) {
      setExcuse(result.excuse);
    } else {
      setError(result.error);
      setExcuse(null);
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Excuse Engine — Debug</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Fixed context: rainy 9°C night, windy, Manchester UK. Groq /
          llama-3.3-70b-versatile.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExcuseCategory)}
            className="w-fit rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Extra details (optional)</span>
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. it's my manager's birthday drinks"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Excuse"}
        </button>
        <button
          onClick={run}
          disabled={loading || (!excuse && !error)}
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
        >
          Regenerate
        </button>
      </div>

      <div aria-live="polite" className="min-h-[3rem]">
        {loading && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Thinking up a cover story…
          </p>
        )}

        {!loading && error && (
          <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && excuse && (
          <blockquote className="rounded-md border border-black/10 bg-black/[.03] p-4 text-lg leading-relaxed dark:border-white/10 dark:bg-white/[.04]">
            {excuse}
          </blockquote>
        )}
      </div>
    </main>
  );
}
