// Firestore excuse history for Coverstory.
// Excuses live at users/{uid}/excuses/{excuseId}. Saving one also bumps the
// user's excuseCount on their profile doc (atomic batch).

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ExcuseRecord {
  id: string;
  excuse: string;
  category: string;
  details?: string;
  location: { city: string; country: string };
  weather: { tempC: number; condition: string };
  timeContext: { hour: number; dayOfWeek: string };
  createdAt: Timestamp | null;
  used: boolean;
}

/** Fields captured when saving a freshly generated excuse. */
export interface SaveExcuseInput {
  excuse: string;
  category: string;
  details?: string;
  location: { city: string; country: string };
  weather: { tempC: number; condition: string };
  timeContext: { hour: number; dayOfWeek: string };
}

/**
 * Save a new excuse and increment the user's excuseCount in one atomic batch.
 * Returns the new excuse id.
 */
export async function saveExcuse(
  uid: string,
  data: SaveExcuseInput
): Promise<string> {
  const excuseRef = doc(collection(db, "users", uid, "excuses"));

  // Firestore rejects undefined fields — only include details when present.
  const record: Record<string, unknown> = {
    id: excuseRef.id,
    excuse: data.excuse,
    category: data.category,
    location: data.location,
    weather: data.weather,
    timeContext: data.timeContext,
    createdAt: serverTimestamp(),
    used: false,
  };
  if (data.details && data.details.trim()) {
    record.details = data.details.trim();
  }

  const batch = writeBatch(db);
  batch.set(excuseRef, record);
  batch.set(
    doc(db, "users", uid),
    { excuseCount: increment(1) },
    { merge: true }
  );
  await batch.commit();

  return excuseRef.id;
}

/** All of a user's excuses, most recent first. */
export async function getUserExcuses(uid: string): Promise<ExcuseRecord[]> {
  const q = query(
    collection(db, "users", uid, "excuses"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ExcuseRecord);
}

/** Set the "used" flag on an excuse (pass the new value to toggle). */
export async function markExcuseUsed(
  uid: string,
  excuseId: string,
  used: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "excuses", excuseId), { used });
}
