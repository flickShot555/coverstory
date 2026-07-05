"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocationWeather } from "@/hooks/useLocationWeather";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { generateExcuse, type ExcuseRequest } from "@/lib/excuseClient";
import type { ExcuseCategory } from "@/lib/excusePrompt";
import { LocationBar } from "@/components/LocationBar";
import { ExcuseResult } from "@/components/ExcuseResult";
import { Modal } from "@/components/Modal";
import { ProfileCompletionForm } from "@/components/ProfileCompletionForm";

const CATEGORIES: { value: ExcuseCategory; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "social", label: "Social" },
  { value: "family", label: "Family" },
  { value: "date", label: "Date" },
  { value: "other", label: "Other" },
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function partOfDay(hour: number): string {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export default function Home() {
  const locationWeather = useLocationWeather();
  const { place, weather } = locationWeather;

  const { user, signInWithGoogle } = useAuth();
  const { profile, loading: profileLoading, needsCompletion, updateProfile } =
    useUserProfile();

  const [category, setCategory] = useState<ExcuseCategory>("other");
  const [details, setDetails] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [phase, setPhase] = useState<"home" | "result">("home");
  const [excuse, setExcuse] = useState<string | null>(null);
  const [contextLabel, setContextLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  const buildContextLabel = useCallback(
    (now: Date): string => {
      const when = `${partOfDay(now.getHours())} on ${DAYS[now.getDay()]}`;
      if (place && weather) {
        return `Based on your location in ${place.city}, ${
          weather.condition
        } ${Math.round(weather.tempC)}°C, ${when}.`;
      }
      return `Based on the ${when}.`;
    },
    [place, weather]
  );

  const doGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);

    const now = new Date();
    const day = now.getDay();
    const firstName = profile?.name ? profile.name.split(" ")[0] : undefined;

    const payload: ExcuseRequest = {
      category,
      details: details.trim() || undefined,
      weather: weather ?? {
        // Fallback when location/weather is unavailable — keeps the request valid.
        tempC: 15,
        condition: "unclear",
        isDay: now.getHours() >= 7 && now.getHours() < 19,
        windSpeed: 0,
      },
      location: place
        ? { city: place.city, country: place.country }
        : { city: "your area", country: "" },
      timeContext: {
        hour: now.getHours(),
        dayOfWeek: DAYS[day],
        isWeekend: day === 0 || day === 6,
      },
      userContext:
        firstName || profile?.dob
          ? { name: firstName, dob: profile?.dob ?? undefined }
          : undefined,
    };

    const label = buildContextLabel(now);
    const result = await generateExcuse(payload);

    if (result.ok) {
      setExcuse(result.excuse);
      setContextLabel(label);
      setPhase("result");
    } else {
      setGenError(result.error);
    }
    setGenerating(false);
  }, [category, details, place, weather, profile, buildContextLabel]);

  // Resume a pending generation once auth + profile prerequisites are met.
  useEffect(() => {
    if (!pendingGenerate) return;
    if (!user) return; // waiting for sign-in
    if (profileLoading) return; // waiting for profile sync
    if (needsCompletion) {
      setShowProfileModal(true);
      return;
    }
    setShowProfileModal(false);
    setPendingGenerate(false);
    void doGenerate();
  }, [pendingGenerate, user, profileLoading, needsCompletion, doGenerate]);

  const handleMainCta = useCallback(async () => {
    if (generating) return;
    setGenError(null);

    if (!user) {
      // Sign in first, then the effect above resumes generation.
      setPendingGenerate(true);
      await signInWithGoogle();
      // If the popup was dismissed, currentUser stays null — cancel the pending run.
      if (!auth.currentUser) setPendingGenerate(false);
      return;
    }

    if (profileLoading) {
      setPendingGenerate(true);
      return;
    }

    if (needsCompletion) {
      setPendingGenerate(true);
      setShowProfileModal(true);
      return;
    }

    void doGenerate();
  }, [generating, user, profileLoading, needsCompletion, signInWithGoogle, doGenerate]);

  const handleStartOver = () => {
    setPhase("home");
    setExcuse(null);
    setGenError(null);
    // Keep category + details so the user can tweak and try again.
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setPendingGenerate(false);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-2xl flex-col px-4 py-8">
      {phase === "home" ? (
        <div className="flex flex-1 flex-col gap-8">
          {/* Section 1 — Location bar */}
          <LocationBar {...locationWeather} />

          {/* Section 2 — Situation context */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
                What are you getting out of?
              </h2>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const selected = category === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      aria-pressed={selected}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "border-transparent bg-foreground text-background"
                          : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {!detailsOpen ? (
                <button
                  onClick={() => setDetailsOpen(true)}
                  className="text-sm text-black/60 underline-offset-4 hover:underline dark:text-white/60"
                >
                  Add details (optional)
                </button>
              ) : (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Details (optional)</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="Anything specific about the situation?"
                    autoFocus
                    className="resize-none rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
                  />
                </label>
              )}
            </div>
          </section>

          {/* Section 3 — Main CTA */}
          <section className="mt-auto flex flex-col gap-3 pt-4">
            <button
              onClick={handleMainCta}
              disabled={generating}
              className="flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-lg font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Spinner />
                  Cooking up your excuse…
                </>
              ) : (
                "Get me out of this"
              )}
            </button>
            {genError && (
              <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                {genError}
              </p>
            )}
          </section>
        </div>
      ) : (
        excuse && (
          <div className="flex flex-1 flex-col justify-center py-4">
            <ExcuseResult
              excuse={excuse}
              contextLabel={contextLabel}
              generating={generating}
              error={genError}
              onRegenerate={doGenerate}
              onStartOver={handleStartOver}
            />
          </div>
        )
      )}

      {/* Profile completion gate before generation */}
      <Modal open={showProfileModal} onClose={closeProfileModal}>
        <ProfileCompletionForm
          initialDob={profile?.dob}
          initialCity={profile?.city ?? place?.city ?? null}
          onSubmit={updateProfile}
        />
      </Modal>
    </main>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background"
      aria-hidden
    />
  );
}
