"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  History,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/geocoding";

export default function ProfilePage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();

  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { coords, error: geoError, loading: locating, requestLocation } =
    useGeolocation();
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    setDob(profile?.dob ?? "");
  }, [profile?.dob]);

  // When GPS resolves (from "Update location"), reverse-geocode and persist.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setUpdatingLocation(true);
    setError(null);
    setStatus(null);
    reverseGeocode(coords.latitude, coords.longitude)
      .then(async (place) => {
        if (cancelled) return;
        await updateProfile({
          city: place.city,
          location: {
            lat: coords.latitude,
            lng: coords.longitude,
            city: place.city,
            country: place.country,
          },
        });
        if (!cancelled) setStatus("Location updated.");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't update your location. Try again.");
      })
      .finally(() => {
        if (!cancelled) setUpdatingLocation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, updateProfile]);

  if (authLoading || (user && profileLoading)) {
    return (
      <main className="mx-auto max-w-[520px] px-5 py-10">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex max-w-[520px] flex-col items-start gap-4 px-5 py-10">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted">You&apos;re not signed in.</p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Sign in with Google
        </button>
      </main>
    );
  }

  const handleSaveDob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ dob });
      setStatus("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const busyLocation = locating || updatingLocation;

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-8 px-5 py-8">
      <div className="flex items-center gap-4">
        {profile?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoURL}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 rounded-full ring-2 ring-accent ring-offset-2 ring-offset-background"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 text-2xl font-semibold text-accent ring-2 ring-accent ring-offset-2 ring-offset-background">
            {(profile?.name ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile?.name ?? "Profile"}</h1>
          <p className="text-sm text-muted">{profile?.email ?? user.email}</p>
        </div>
      </div>

      {/* Excuses dodged stat */}
      <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 p-6">
        <div>
          <p className="text-5xl font-extrabold leading-none text-accent">
            {profile?.excuseCount ?? 0}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {(profile?.excuseCount ?? 0) === 1
              ? "excuse dodged"
              : "excuses dodged"}
          </p>
        </div>
        <Link
          href="/history"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          <History className="h-4 w-4" aria-hidden />
          View history
        </Link>
      </div>

      {/* Location — GPS only, no manual entry */}
      <section className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-muted" aria-hidden />
          Location
        </span>
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex items-center gap-2 text-sm">
            {profile?.location ? (
              <>
                <Check className="h-4 w-4 text-success" aria-hidden />
                {profile.location.city}, {profile.location.country}
              </>
            ) : (
              <span className="text-muted">Not set</span>
            )}
          </span>
          <button
            onClick={requestLocation}
            disabled={busyLocation}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {busyLocation ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Updating…
              </>
            ) : (
              "Update location"
            )}
          </button>
        </div>
        {geoError && <span className="text-xs text-danger">{geoError}</span>}
      </section>

      {/* Date of birth */}
      <form onSubmit={handleSaveDob} className="flex flex-col gap-3">
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
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none transition-colors focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {status && <p className="text-sm text-success">{status}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-cta transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="border-t border-border pt-6">
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </main>
  );
}
