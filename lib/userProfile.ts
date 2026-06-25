// Firestore user-profile helpers for Coverstory.
// Profiles live at users/{uid}.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type FieldValue,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  /** ISO date string (YYYY-MM-DD); null until the user completes their profile. */
  dob: string | null;
  /** City name; null until completed (can be prefilled from geolocation). */
  city: string | null;
  createdAt: Timestamp | null;
  lastActiveAt: Timestamp | null;
}

/** Identity fields pulled from the Google auth user when creating a profile. */
export interface NewProfileData {
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

/** Fields a user (or sign-in flow) may update. */
export type UserProfileUpdate = Partial<{
  name: string | null;
  email: string | null;
  photoURL: string | null;
  dob: string | null;
  city: string | null;
  lastActiveAt: FieldValue;
}>;

function profileRef(uid: string) {
  return doc(db, "users", uid);
}

/** Fetch the profile document for a uid, or null if it doesn't exist yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/** Create a profile document on first sign-in. dob/city start null. */
export async function createUserProfile(
  uid: string,
  data: NewProfileData
): Promise<void> {
  await setDoc(profileRef(uid), {
    uid,
    name: data.name,
    email: data.email,
    photoURL: data.photoURL,
    dob: null,
    city: null,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });
}

/** Partial update — used to complete dob/city and to bump lastActiveAt. */
export async function updateUserProfile(
  uid: string,
  data: UserProfileUpdate
): Promise<void> {
  await updateDoc(profileRef(uid), data);
}

/**
 * Called on every sign-in. Creates the profile if it's the user's first time,
 * otherwise just refreshes lastActiveAt. Returns the current profile.
 */
export async function syncProfileOnSignIn(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await createUserProfile(user.uid, {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
  } else {
    await updateUserProfile(user.uid, { lastActiveAt: serverTimestamp() });
  }
  // Re-read so the caller gets resolved server timestamps and any merged data.
  const profile = await getUserProfile(user.uid);
  if (!profile) throw new Error("Profile could not be loaded after sign-in.");
  return profile;
}
