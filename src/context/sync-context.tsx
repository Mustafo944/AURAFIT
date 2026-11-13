"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { getSyncQueue, type SyncTask } from "@/lib/idb";
import { syncQueue } from "@/lib/sync-queue";

interface SyncState {
  tasks: SyncTask[];
  ready: boolean;
  offline: boolean;
  busy: boolean;
  failed: boolean;
  storageFailed: boolean;
  retry: () => void;
}
const initial: SyncState = {
  tasks: [],
  ready: false,
  offline: false,
  busy: false,
  failed: false,
  storageFailed: false,
  retry: () => {},
};
const SyncContext = createContext(initial);
export function SyncProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return (
    <AccountSyncProvider key={userId ?? "anonymous"} userId={userId}>
      {children}
    </AccountSyncProvider>
  );
}
function AccountSyncProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let cancelled = false;
    let working = false;
    let queued = false;
    const update = (patch: Partial<SyncState>) => {
      if (!cancelled)
        setState((previous) => {
          const next = { ...previous, ...patch };
          if (JSON.stringify(previous.tasks) === JSON.stringify(next.tasks)) next.tasks = previous.tasks;
          return (Object.keys(next) as (keyof SyncState)[]).every((key) => next[key] === previous[key])
            ? previous
            : next;
        });
    };
    const refresh = async () => {
      if (cancelled) return;
      if (working) {
        queued = true;
        return;
      }
      working = true;
      try {
        const tasks = (await getSyncQueue()).filter((task) => task.payload.userId === userId);
        update({ tasks, ready: true, offline: !navigator.onLine, storageFailed: false });
        if (!tasks.length) update({ failed: false });
        if (!navigator.onLine || !userId || !tasks.length) return;
        update({ busy: true, failed: false });
        try {
          await syncQueue(userId);
          if (!cancelled) window.dispatchEvent(new Event("aurafit-data-changed"));
        } catch {
          update({ failed: true });
        }
        update({ tasks: (await getSyncQueue()).filter((task) => task.payload.userId === userId) });
      } catch {
        update({ storageFailed: true, ready: true });
      } finally {
        update({ busy: false });
        working = false;
        if (queued && !cancelled) {
          queued = false;
          void refresh();
        }
      }
    };
    const initialTimer = setTimeout(() => void refresh(), 0);
    const retryTimer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    for (const event of ["online", "offline", "aurafit-sync-needed", "aurafit-sync-retry"])
      window.addEventListener(event, refresh);
    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const event of ["online", "offline", "aurafit-sync-needed", "aurafit-sync-retry"])
        window.removeEventListener(event, refresh);
    };
  }, [userId]);
  return (
    <SyncContext.Provider
      value={{ ...state, retry: () => window.dispatchEvent(new Event("aurafit-sync-retry")) }}
    >
      {children}
    </SyncContext.Provider>
  );
}
export function useSyncState() {
  return useContext(SyncContext);
}

export function taskEntityId(task: SyncTask): string {
  switch (task.type) {
    case "INSERT_SESSION":
      return task.payload.session.id;
    case "DELETE_SESSION":
      return task.payload.sessionId;
    case "INSERT_WEIGHT":
      return task.payload.entry.id;
    case "UPDATE_PROFILE":
      return task.payload.userId;
    default:
      return task.payload.id;
  }
}
