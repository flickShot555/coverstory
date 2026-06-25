"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  syncProfileOnSignIn,
  updateUserProfile,
  getUserProfile,
  type UserProfile,
  type UserProfileUpdate,
} from "@/lib/userProfile";

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
 * Combines auth state with the Firestore profile. On sign-in it ensures the
 * profile exists (creating it if needed) and bumps lastActiveAt.
 */
export function useUserProfile(): UseUserProfile {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    syncProfileOnSignIn(user)
      .then((synced) => {
        if (!cancelled) setProfile(synced);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load your profile."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await getUserProfile(user.uid);
      setProfile(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh your profile."
      );
    }
  }, [user]);

  const updateProfile = useCallback(
    async (data: UserProfileUpdate) => {
      if (!user) throw new Error("You must be signed in to update your profile.");
      await updateUserProfile(user.uid, data);
      await refresh();
    },
    [user, refresh]
  );

  const needsCompletion =
    !!profile && (profile.dob === null || profile.city === null);

  return { profile, loading, needsCompletion, error, updateProfile, refresh };
}
