"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface UseAuth {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

/** Translate Firebase auth error codes into friendly, non-crashing messages. */
function messageForAuthError(err: unknown): string | null {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      // User dismissed the popup — not really an error worth shouting about.
      return null;
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Please allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized for sign-in in the Firebase console.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

/**
 * Wraps Firebase Auth state and exposes Google sign-in / sign-out.
 * Errors are captured into `error` rather than thrown to the UI.
 */
export function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const message = messageForAuthError(err);
      if (message) setError(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      setError("Sign-out failed. Please try again.");
    }
  }, []);

  return { user, loading, error, signInWithGoogle, signOut };
}
