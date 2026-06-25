"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function AuthDebugPage() {
  const { user, loading: authLoading, error: authError, signInWithGoogle, signOut } =
    useAuth();
  const { profile, loading: profileLoading, needsCompletion, error: profileError } =
    useUserProfile();

  const rawAuth = user
    ? {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        providerId: user.providerData[0]?.providerId ?? null,
      }
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Auth &amp; Profile — Debug</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Raw auth state, Firestore profile, and the needsCompletion flag.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={signInWithGoogle}
          disabled={!!user}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign in with Google
        </button>
        <button
          onClick={signOut}
          disabled={!user}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </div>

      {(authError || profileError) && (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {authError ?? profileError}
        </p>
      )}

      <Section title="Flags">
        <ul className="font-mono text-xs">
          <li>authLoading: {String(authLoading)}</li>
          <li>profileLoading: {String(profileLoading)}</li>
          <li>signedIn: {String(!!user)}</li>
          <li>needsCompletion: {String(needsCompletion)}</li>
        </ul>
      </Section>

      <Section title="Raw auth state">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">
          {JSON.stringify(rawAuth, null, 2)}
        </pre>
      </Section>

      <Section title="Firestore profile">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
