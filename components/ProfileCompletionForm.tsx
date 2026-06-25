"use client";

import { useEffect, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocoding";
import type { UserProfileUpdate } from "@/lib/userProfile";

interface ProfileCompletionFormProps {
  initialDob?: string | null;
  initialCity?: string | null;
  /** Persist the completed fields (typically useUserProfile().updateProfile). */
  onSubmit: (data: UserProfileUpdate) => Promise<void>;
}

/**
 * Collects date of birth and city to complete a profile.
 * City can be prefilled from Layer 1 geolocation via "Use my location".
 */
export function ProfileCompletionForm({
  initialDob,
  initialCity,
  onSubmit,
}: ProfileCompletionFormProps) {
  const [dob, setDob] = useState(initialDob ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    coords,
    error: geoError,
    loading: locating,
    requestLocation,
  } = useGeolocation();
  const [resolvingCity, setResolvingCity] = useState(false);

  // When geolocation resolves, reverse-geocode and prefill the city field.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setResolvingCity(true);
    reverseGeocode(coords.latitude, coords.longitude)
      .then((place) => {
        if (!cancelled) setCity(place.city);
      })
      .catch(() => {
        // Non-fatal: user can still type a city manually.
      })
      .finally(() => {
        if (!cancelled) setResolvingCity(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your city.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ dob, city: city.trim() });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Complete your profile</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          We just need your date of birth and city.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Date of birth</span>
        <input
          type="date"
          value={dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDob(e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">City</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
            className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            required
          />
          <button
            type="button"
            onClick={requestLocation}
            disabled={locating || resolvingCity}
            className="whitespace-nowrap rounded-md border border-black/15 px-3 py-2 text-xs transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            {locating || resolvingCity ? "Locating…" : "Use my location"}
          </button>
        </div>
        {geoError && <span className="text-xs text-amber-600">{geoError}</span>}
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
