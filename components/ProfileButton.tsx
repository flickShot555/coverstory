"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ProfileCompletionForm } from "./ProfileCompletionForm";

/**
 * Adaptive profile entry point:
 *  - signed out         -> "Sign in with Google" button
 *  - needs completion   -> inline ProfileCompletionForm
 *  - complete           -> avatar + name, navigates to /profile
 */
export function ProfileButton() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError, signInWithGoogle } =
    useAuth();
  const { profile, loading: profileLoading, needsCompletion, updateProfile } =
    useUserProfile();

  if (authLoading || (user && profileLoading)) {
    return <span className="text-sm text-black/50 dark:text-white/50">…</span>;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Sign in with Google to create your profile
        </button>
        {authError && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {authError}
          </span>
        )}
      </div>
    );
  }

  if (needsCompletion) {
    return (
      <ProfileCompletionForm
        initialDob={profile?.dob}
        initialCity={profile?.city}
        onSubmit={updateProfile}
      />
    );
  }

  return (
    <button
      onClick={() => router.push("/profile")}
      className="flex items-center gap-2 rounded-full border border-black/15 py-1 pl-1 pr-4 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      {profile?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoURL}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs dark:bg-white/20">
          {(profile?.name ?? "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{profile?.name ?? "Profile"}</span>
    </button>
  );
}
