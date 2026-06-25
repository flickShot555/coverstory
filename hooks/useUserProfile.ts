"use client";

import { useAuthContext } from "@/components/AuthProvider";
import type { UserProfile, UserProfileUpdate } from "@/lib/userProfile";

export interface UseUserProfile {
  profile: UserProfile | null;
  loading: boolean;
  /** True when signed in but dob or city is still null. */
  needsCompletion: boolean;
  error: string | null;
  /** Apply a partial update and refresh local profile state. */
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  /** Re-fetch the profile from Firestore. */
  refresh: () => Promise<void>;
}

/**
 * Firestore profile state, backed by the shared AuthProvider context.
 * The profile is synced once per sign-in (creating it if needed and bumping
 * lastActiveAt) rather than once per consuming component.
 */
export function useUserProfile(): UseUserProfile {
  const { profile, profileLoading, profileError, needsCompletion, updateProfile, refresh } =
    useAuthContext();
  return {
    profile,
    loading: profileLoading,
    needsCompletion,
    error: profileError,
    updateProfile,
    refresh,
  };
}
