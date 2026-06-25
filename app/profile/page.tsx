"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function ProfilePage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();

  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync local form state when the profile loads/changes.
  useEffect(() => {
    setDob(profile?.dob ?? "");
    setCity(profile?.city ?? "");
  }, [profile?.dob, profile?.city]);

  if (authLoading || (user && profileLoading)) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 p-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          You&apos;re not signed in.
        </p>
        <button
          onClick={signInWithGoogle}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

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
      await updateProfile({ dob, city: city.trim() });
      setStatus("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-8">
      <div className="flex items-center gap-4">
        {profile?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoURL}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/10 text-xl dark:bg-white/20">
            {(profile?.name ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile?.name ?? "Profile"}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {profile?.email ?? user.email}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Date of birth</span>
          <input
            type="date"
            value={dob}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDob(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {status && (
          <p className="text-sm text-green-600 dark:text-green-400">{status}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="border-t border-black/10 pt-6 dark:border-white/10">
        <button
          onClick={signOut}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
