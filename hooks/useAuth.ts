"use client";

import type { User } from "firebase/auth";
import { useAuthContext } from "@/components/AuthProvider";

export interface UseAuth {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Auth state + Google sign-in/out, backed by the shared AuthProvider context
 * (single onAuthStateChanged listener for the whole app).
 */
export function useAuth(): UseAuth {
  const { user, authLoading, authError, signInWithGoogle, signOut } =
    useAuthContext();
  return {
    user,
    loading: authLoading,
    error: authError,
    signInWithGoogle,
    signOut,
  };
}
