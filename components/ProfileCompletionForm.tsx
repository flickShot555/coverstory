"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, LoaderCircle, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocoding";
import type { ProfileLocation, UserProfileUpdate } from "@/lib/userProfile";

interface ProfileCompletionFormProps {
  initialDob?: string | null;
  onSubmit: (data: UserProfileUpdate) => Promise<void>;
}

/**
 * Completes a profile with date of birth and a GPS-confirmed location.
 * There is no manual city entry — location must come from device GPS.
 */
export function ProfileCompletionForm({
  initialDob,
  onSubmit,
}: ProfileCompletionFormProps) {
  const [dob, setDob] = useState(initialDob ?? "");
  const [location, setLocation] = useState<ProfileLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    coords,
    error: geoError,
    loading: locating,
    requestLocation,
  } = useGeolocation();

  // When GPS resolves, reverse-geocode into a city/country for storage.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setResolving(true);
    setError(null);
    reverseGeocode(coords.latitude, coords.longitude)
      .then((place) => {
        if (cancelled) return;
        setLocation({
          lat: coords.latitude,
          lng: coords.longitude,
          city: place.city,
          country: place.country,
        });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't resolve your location. Try again.");
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const busyLocating = locating || resolving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!location) {
      setError("Please confirm your location to continue.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ dob, city: location.city, location });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Finish your profile</h2>
        <p className="mt-1 text-sm text-muted">
          We use your age and location to make excuses believable.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted" aria-hidden />
          Date of birth
        </span>
        <input
          type="date"
          value={dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDob(e.target.value)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-accent"
          required
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-muted" aria-hidden />
          Location
        </span>

        {location ? (
          <div className="flex items-center justify-between rounded-xl border border-success/40 bg-success/10 px-4 py-3">
            <span className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success" aria-hidden />
              {location.city}, {location.country}
            </span>
            <button
              type="button"
              onClick={requestLocation}
              disabled={busyLocating}
              className="text-xs text-muted underline-offset-4 hover:underline disabled:opacity-50"
            >
              Redo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestLocation}
            disabled={busyLocating}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-hover disabled:opacity-60"
          >
            {busyLocating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Getting location…
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" aria-hidden />
                Use my location
              </>
            )}
          </button>
        )}
        {geoError && <span className="text-xs text-danger">{geoError}</span>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving || !location || !dob}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-cta transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:shadow-none"
      >
        {saving ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
