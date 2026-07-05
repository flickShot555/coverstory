// Firebase client setup for Coverstory.
// Initializes the Firebase app from the NEXT_PUBLIC_FIREBASE_* env vars and
// exports shared `auth` and `db` instances.
//
// These vars must be present at build AND runtime (locally via .env.local, in
// production via the Vercel dashboard). NEXT_PUBLIC_* values are injected at
// build time, so getAuth() has a valid apiKey during static generation.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app across hot reloads / multiple imports.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeApp / getFirestore don't validate the apiKey, so they're safe to
// run during server prerendering (they never touch the network at build time).
export const db: Firestore = getFirestore(app);

// getAuth(), however, eagerly rejects a missing/empty apiKey with
// auth/invalid-api-key. During `next build` the client components below are
// prerendered on the server, so an eager getAuth() would crash the build when
// the env is absent. Initialize Auth lazily instead — it only ever runs in the
// browser, where the app's effects actually use it.
let authInstance: Auth | undefined;
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

export { app };
