"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Nav profile control:
 *  - signed out -> "Sign in" button (triggers Google popup)
 *  - signed in  -> avatar + first name, navigates to /profile
 * Profile completion itself is handled by the home flow, not here.
 */
export function ProfileButton() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError, signInWithGoogle } =
    useAuth();
  const { profile } = useUserProfile();

  if (authLoading) {
    return <span className="text-sm text-muted">…</span>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Sign in
        </button>
        {authError && <span className="text-xs text-danger">{authError}</span>}
      </div>
    );
  }

  const firstName = profile?.name?.split(" ")[0] ?? "Profile";

  return (
    <button
      onClick={() => router.push("/profile")}
      className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 transition-colors hover:bg-surface-hover"
    >
      {profile?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoURL}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
          {firstName.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{firstName}</span>
    </button>
  );
}
