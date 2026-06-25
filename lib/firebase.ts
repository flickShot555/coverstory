// Firebase client setup for Coverstory.
// Initializes the Firebase app from the NEXT_PUBLIC_* env vars in .env.local
// and exports shared `auth` and `db` instances.
//
// Real project credentials are added to .env.local manually. Until then the
// config values are empty strings — initialization succeeds, but live auth /
// Firestore calls will only work once real keys are present.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// getAuth() eagerly rejects a missing/empty apiKey with auth/invalid-api-key,
// which would break `next build` while .env.local still holds empty placeholders.
// The fallback lets the app initialize at build time; real keys override it, and
// no auth network calls happen during build so the placeholder is never used live.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app across hot reloads / multiple imports.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export { app };
