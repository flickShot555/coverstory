"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  syncProfileOnSignIn,
  updateUserProfile,
  getUserProfile,
  type UserProfile,
  type UserProfileUpdate,
} from "@/lib/userProfile";

export interface AuthContextValue {
  // Auth
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Profile
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  needsCompletion: boolean;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Translate Firebase auth error codes into friendly, non-crashing messages. */
function messageForAuthError(err: unknown): string | null {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
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
 * App-wide auth + profile provider. Mounts a single onAuthStateChanged
 * listener and runs one profile sync per sign-in, shared by all consumers.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Single auth-state subscription for the whole app.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync the Firestore profile whenever the signed-in user changes.
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    syncProfileOnSignIn(user)
      .then((synced) => {
        if (!cancelled) setProfile(synced);
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(
            err instanceof Error ? err.message : "Failed to load your profile."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const message = messageForAuthError(err);
      if (message) setAuthError(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      setAuthError("Sign-out failed. Please try again.");
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await getUserProfile(user.uid);
      setProfile(fresh);
    } catch (err) {
      setProfileError(
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

  // Profile is incomplete until we have both a date of birth and a confirmed
  // GPS location (location is mandatory to generate hyperlocal excuses).
  const needsCompletion =
    !!profile && (profile.dob === null || profile.location == null);

  const value: AuthContextValue = {
    user,
    authLoading,
    authError,
    signInWithGoogle,
    signOut,
    profile,
    profileLoading,
    profileError,
    needsCompletion,
    updateProfile,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Internal accessor; throws if used outside <AuthProvider>. */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>.");
  }
  return ctx;
}
