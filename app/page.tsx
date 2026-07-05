"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LoaderCircle, Sparkles } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGeolocation, type Coords } from "@/hooks/useGeolocation";
import { reverseGeocode, type Place } from "@/lib/geocoding";
import { getWeather, type Weather } from "@/lib/weather";
import { generateExcuse, type ExcuseRequest } from "@/lib/excuseClient";
import { saveExcuse } from "@/lib/excuseHistory";
import type { ExcuseCategory } from "@/lib/excusePrompt";
import { LocationBar } from "@/components/LocationBar";
import { ExcuseResult } from "@/components/ExcuseResult";
import { Modal } from "@/components/Modal";
import { ProfileCompletionForm } from "@/components/ProfileCompletionForm";
import { LocationGate } from "@/components/LocationGate";

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

interface SessionLocation {
  coords: Coords;
  place: Place;
  weather: Weather;
}

export default function Home() {
  const { user, signInWithGoogle } = useAuth();
  const {
    profile,
    loading: profileLoading,
    needsCompletion,
    updateProfile,
    refresh,
  } = useUserProfile();
  const geo = useGeolocation();

  const [category, setCategory] = useState<ExcuseCategory>("other");
  const [details, setDetails] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [sessionLoc, setSessionLoc] = useState<SessionLocation | null>(null);

  const [phase, setPhase] = useState<"home" | "result">("home");
  const [excuse, setExcuse] = useState<string | null>(null);
  const [contextLabel, setContextLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  const profileComplete = !!user && !profileLoading && !needsCompletion;
  const locationDenied = profileComplete && !sessionLoc && !!geo.error;

  // Reset session location when the user signs out.
  const requestedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      requestedRef.current = false;
      setSessionLoc(null);
    }
  }, [user]);

  // Re-confirm location once per session for complete profiles (user may have moved).
  useEffect(() => {
    if (!profileComplete || sessionLoc || requestedRef.current) return;
    requestedRef.current = true;
    geo.requestLocation();
  }, [profileComplete, sessionLoc, geo]);

  // When GPS resolves, reverse-geocode + fetch weather, then persist to Firestore.
  useEffect(() => {
    if (!geo.coords || !user) return;
    const { latitude, longitude } = geo.coords;
    let cancelled = false;

    (async () => {
      try {
        const [place, weather] = await Promise.all([
          reverseGeocode(latitude, longitude),
          getWeather(latitude, longitude),
        ]);
        if (cancelled) return;
        await updateProfile({
          city: place.city,
          location: { lat: latitude, lng: longitude, city: place.city, country: place.country },
        });
        if (cancelled) return;
        setSessionLoc({ coords: geo.coords!, place, weather });
      } catch {
        // Leave sessionLoc null; the gate / confirming state handles the UI.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geo.coords, user, updateProfile]);

  const doGenerate = useCallback(async () => {
    if (!sessionLoc) return;
    setGenerating(true);
    setGenError(null);
    setSaved(false);

    const now = new Date();
    const day = now.getDay();
    const firstName = profile?.name ? profile.name.split(" ")[0] : undefined;

    const payload: ExcuseRequest = {
      category,
      details: details.trim() || undefined,
      weather: {
        tempC: sessionLoc.weather.tempC,
        condition: sessionLoc.weather.condition,
        isDay: sessionLoc.weather.isDay,
        windSpeed: sessionLoc.weather.windSpeed,
      },
      location: {
        city: sessionLoc.place.city,
        country: sessionLoc.place.country,
      },
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

    const label = `Based on your location in ${sessionLoc.place.city}, ${
      sessionLoc.weather.condition
    } ${Math.round(sessionLoc.weather.tempC)}°C, ${partOfDay(
      now.getHours()
    )} on ${DAYS[day]}.`;

    const result = await generateExcuse(payload);
    if (result.ok) {
      setExcuse(result.excuse);
      setContextLabel(label);
      setPhase("result");

      // Fire-and-forget: save to history + bump the counter without blocking UI.
      if (user) {
        saveExcuse(user.uid, {
          excuse: result.excuse,
          category,
          details: details.trim() || undefined,
          location: payload.location,
          weather: {
            tempC: payload.weather.tempC,
            condition: payload.weather.condition,
          },
          timeContext: {
            hour: payload.timeContext.hour,
            dayOfWeek: payload.timeContext.dayOfWeek,
          },
        })
          .then(() => {
            setSaved(true);
            void refresh();
          })
          .catch(() => {
            // Non-fatal: the excuse is already shown; history save is best-effort.
          });
      }
    } else {
      setGenError(result.error);
    }
    setGenerating(false);
  }, [sessionLoc, category, details, profile, user, refresh]);

  // Resume a pending generation once all prerequisites are satisfied.
  useEffect(() => {
    if (!pendingGenerate) return;
    if (!user || profileLoading) return;
    if (needsCompletion) {
      setShowProfileModal(true);
      return;
    }
    if (locationDenied) {
      setPendingGenerate(false);
      return;
    }
    if (!sessionLoc) return; // still confirming location
    setShowProfileModal(false);
    setPendingGenerate(false);
    void doGenerate();
  }, [
    pendingGenerate,
    user,
    profileLoading,
    needsCompletion,
    locationDenied,
    sessionLoc,
    doGenerate,
  ]);

  const handleMainCta = useCallback(async () => {
    if (generating) return;
    setGenError(null);

    if (!user) {
      setPendingGenerate(true);
      await signInWithGoogle();
      if (!getFirebaseAuth().currentUser) setPendingGenerate(false); // popup dismissed
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
    if (!sessionLoc) {
      setPendingGenerate(true); // wait for location confirmation
      return;
    }
    void doGenerate();
  }, [generating, user, profileLoading, needsCompletion, sessionLoc, signInWithGoogle, doGenerate]);

  const handleStartOver = () => {
    setPhase("home");
    setExcuse(null);
    setGenError(null);
    setSaved(false);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setPendingGenerate(false);
  };

  // Hard gate: signed-in, complete, but location denied this session.
  if (locationDenied) {
    return <LocationGate onRetry={() => geo.requestLocation()} retrying={geo.loading} />;
  }

  const ctaLabel = generating
    ? "Cooking up your excuse…"
    : "Get me out of this";

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-61px)] w-full max-w-[520px] flex-col justify-center gap-5 px-5 py-8">
      {phase === "home" ? (
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <LocationBar
              place={sessionLoc?.place ?? null}
              weather={sessionLoc?.weather ?? null}
              confirming={!!user && !sessionLoc}
              signedOut={!user}
            />
          </div>

          {/* Grouped interaction card */}
          <div className="flex flex-col gap-7 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-sm sm:p-7">
            <div className="flex flex-col gap-2.5">
              <h1 className="text-5xl font-extrabold leading-[1.03] tracking-tight text-balance">
                Need a <span className="text-accent">way out?</span>
              </h1>
              <p className="text-[15px] leading-relaxed text-white/60">
                Pick your situation and we&apos;ll craft a believable, local excuse.
              </p>
              {user && (profile?.excuseCount ?? 0) > 0 && (
                <p className="text-sm font-semibold text-accent">
                  You&apos;ve dodged {profile!.excuseCount} plan
                  {profile!.excuseCount === 1 ? "" : "s"} so far
                </p>
              )}
            </div>

            {/* Category chips */}
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                What are you getting out of?
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {CATEGORIES.map((c) => {
                  const selected = category === c.value;
                  return (
                    <motion.button
                      key={c.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategory(c.value)}
                      aria-pressed={selected}
                      className={`rounded-full border px-5 py-3 text-sm font-semibold transition-all ${
                        selected
                          ? "border-accent bg-accent text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                          : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {c.label}
                    </motion.button>
                  );
                })}
              </div>

              <div>
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      detailsOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                  Add details (optional)
                </button>
                <AnimatePresence initial={false}>
                  {detailsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        rows={3}
                        placeholder="Anything specific about the situation?"
                        className="mt-3 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Main CTA */}
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleMainCta}
                disabled={generating}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 py-5 text-lg font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-shadow hover:shadow-[0_0_45px_rgba(139,92,246,0.7)] disabled:opacity-70"
              >
                {generating ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-5 w-5" aria-hidden />
                )}
                {ctaLabel}
              </motion.button>
              {genError && (
                <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                  {genError}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        excuse && (
          <div className="py-2">
            <ExcuseResult
              excuse={excuse}
              contextLabel={contextLabel}
              generating={generating}
              error={genError}
              saved={saved}
              onRegenerate={doGenerate}
              onStartOver={handleStartOver}
            />
          </div>
        )
      )}

      <Modal open={showProfileModal} onClose={closeProfileModal}>
        <ProfileCompletionForm initialDob={profile?.dob} onSubmit={updateProfile} />
      </Modal>
    </main>
  );
}
