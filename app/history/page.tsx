"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserExcuses,
  markExcuseUsed,
  type ExcuseRecord,
} from "@/lib/excuseHistory";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { Timestamp } from "firebase/firestore";

const CATEGORY_STYLES: Record<string, string> = {
  work: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  social: "bg-green-500/20 text-green-300 border-green-500/30",
  family: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  date: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  other: "bg-white/10 text-white/60 border-white/20",
};

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** "Today at 9:41 PM" / "Yesterday at 2:13 PM" / "Mon, Jun 30". */
function formatWhen(ts: Timestamp | null): string {
  if (!ts) return "";
  const date = ts.toDate();
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / dayMs);

  if (date.getTime() >= startOfToday.getTime()) return `Today at ${time}`;
  if (diffDays < 1) return `Yesterday at ${time}`;

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [excuses, setExcuses] = useState<ExcuseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Require sign-in — redirect home once we know the user is signed out.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getUserExcuses(user.uid)
      .then((list) => {
        if (!cancelled) setExcuses(list);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your history. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleUsed = useCallback(
    async (record: ExcuseRecord) => {
      if (!user) return;
      const next = !record.used;
      // Optimistic update.
      setExcuses((prev) =>
        prev.map((e) => (e.id === record.id ? { ...e, used: next } : e))
      );
      try {
        await markExcuseUsed(user.uid, record.id, next);
      } catch {
        // Revert on failure.
        setExcuses((prev) =>
          prev.map((e) => (e.id === record.id ? { ...e, used: !next } : e))
        );
      }
    },
    [user]
  );

  if (authLoading || (user && loading)) {
    return (
      <main className="mx-auto flex max-w-[520px] flex-col gap-4 px-5 py-8">
        <h1 className="text-2xl font-bold">Your history</h1>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border bg-surface"
          />
        ))}
      </main>
    );
  }

  if (!user) return null; // redirecting

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-5 px-5 py-8">
      <h1 className="text-2xl font-bold">Your history</h1>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!error && excuses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
            <Sparkles className="h-7 w-7 text-accent" aria-hidden />
          </div>
          <div>
            <p className="font-semibold">No excuses yet</p>
            <p className="mt-1 text-sm text-muted">
              Your cover stories will show up here once you make one.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-cta transition-colors hover:bg-accent-hover"
          >
            Generate your first excuse
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {excuses.map((e, i) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
              className={`relative rounded-2xl border border-border bg-surface p-5 transition-opacity ${
                e.used ? "opacity-60" : ""
              }`}
            >
              {e.used && (
                <span
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success"
                  aria-label="Used"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}

              <div className="mb-3 flex items-center justify-between gap-3 pr-8">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.other
                  }`}
                >
                  {categoryLabel(e.category)}
                </span>
                <span className="text-xs text-muted">{formatWhen(e.createdAt)}</span>
              </div>

              <p className="leading-relaxed">{e.excuse}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {e.location.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <WeatherIcon
                    condition={e.weather.condition}
                    className="h-3.5 w-3.5"
                  />
                  <span className="capitalize">{e.weather.condition}</span>,{" "}
                  {Math.round(e.weather.tempC)}°C
                </span>
              </div>

              <button
                onClick={() => toggleUsed(e)}
                className={`mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  e.used
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-background text-muted hover:text-foreground"
                }`}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {e.used ? "Used" : "Mark as used"}
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </main>
  );
}
