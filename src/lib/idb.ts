"use client";

import type { WorkoutSession } from "@/lib/workout-log";
import type { MealEntry } from "@/lib/meal-log";
import type { WeightEntry } from "@/lib/weight-log";
import type { UserProfile } from "@/context/user-profile-context";

// Minimalistik, tezkor va kutubxonalarga qaram bo'lmagan IndexedDB o'rami.
// Oflayn ma'lumotlar va sinxronizatsiya navbatlarini boshqaradi.

const DB_NAME = "aurafit_db";
const STORE_NAME = "keyval";
const QUEUE_STORE = "sync_queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("No IDB in SSR"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      // Key/value xotira
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
      // Oflayn so'rovlar navbati
      if (!req.result.objectStoreNames.contains(QUEUE_STORE)) {
        req.result.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// === 1. KESH (Lokal Ma'lumotlar Bazasi) ===

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await idbGetStrict<T>(key);
  } catch {
    return undefined;
  }
}

export async function idbGetStrict<T>(key: string): Promise<T | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db?.close();
  }
}

// Cache failures are harmless; durable mutations use writeQueue below.
export async function idbSetStrict(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Saqlash amalga oshmadi"));
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(value, key);
    });
  } finally {
    db.close();
  }
}
export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    await idbSetStrict(key, value);
  } catch {
    /* Disposable cache only. */
  }
}

// === 2. OFLAYN NAVBAT (Sync Queue) ===

export type SyncOperation =
  | { type: "INSERT_SESSION"; payload: { userId: string; session: WorkoutSession } }
  | { type: "DELETE_SESSION"; payload: { userId: string; sessionId: string } }
  | {
      type: "UPDATE_ADVICE";
      payload: { userId: string; id: string; advice: { recoveryAdvice: string; progressAdvice: string } };
    }
  | {
      type: "INSERT_MEAL";
      payload: { userId: string; id: string; meal: Omit<MealEntry, "id" | "timestamp">; timestamp: string };
    }
  | { type: "DELETE_MEAL"; payload: { userId: string; id: string } }
  | { type: "INSERT_WEIGHT"; payload: { userId: string; entry: WeightEntry } }
  | { type: "UPDATE_PROFILE"; payload: { userId: string; profile: UserProfile } };
export type SyncTask = SyncOperation & { id?: number; timestamp: number };

async function writeQueue(write: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Saqlash amalga oshmadi"));
      tx.onerror = () => reject(tx.error);
      write(tx.objectStore(QUEUE_STORE));
    });
  } finally {
    db.close();
  }
}

export async function pushSyncTask(task: SyncOperation): Promise<void> {
  await writeQueue((store) => {
    store.add({ ...task, timestamp: Date.now() });
  });
  window.dispatchEvent(new Event("aurafit-sync-needed"));
}

export async function getSyncQueue(): Promise<SyncTask[]> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function removeSyncTask(id: number): Promise<void> {
  await writeQueue((store) => {
    store.delete(id);
  });
}
