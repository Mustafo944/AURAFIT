"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/context/auth-context";
import { idbGet, idbSet } from "@/lib/idb";

export interface ResourceSnapshot<T> {
  value: T;
  loading: boolean;
  error: string | null;
}

// One snapshot per account, shared by every mounted consumer. Revisions prevent
// a slow request from overwriting a newer local edit or pagination result.
export function createUserResource<T>(
  key: string,
  initial: T,
  load: (userId: string, previous: T) => Promise<T>,
) {
  const empty: ResourceSnapshot<T> = { value: initial, loading: true, error: null };
  const anonymous: ResourceSnapshot<T> = { value: initial, loading: false, error: null };
  const entries = new Map<
    string,
    {
      snapshot: ResourceSnapshot<T>;
      revision: number;
      pending: boolean;
      loadedAt: number;
      listeners: Set<() => void>;
    }
  >();
  function entry(userId: string) {
    let value = entries.get(userId);
    if (!value) {
      value = { snapshot: empty, revision: 0, pending: false, loadedAt: 0, listeners: new Set() };
      entries.set(userId, value);
    }
    return value;
  }
  function publish(userId: string, snapshot: ResourceSnapshot<T>) {
    const state = entry(userId);
    state.snapshot = snapshot;
    for (const listener of state.listeners) listener();
  }
  async function refresh(userId: string) {
    const state = entry(userId);
    if (state.pending) return;
    state.pending = true;
    const revision = state.revision;
    try {
      if (!state.loadedAt) {
        const cached = await idbGet<T>(`${key}_${userId}`);
        if (cached !== undefined && revision === state.revision)
          publish(userId, { value: cached, loading: true, error: null });
      }
      const value = await load(userId, state.snapshot.value);
      if (revision === state.revision) {
        state.loadedAt = Date.now();
        publish(userId, { value, loading: false, error: null });
        void idbSet(`${key}_${userId}`, value);
      }
    } catch {
      if (revision === state.revision)
        publish(userId, {
          ...state.snapshot,
          loading: false,
          error: "Serverdan yuklab bo'lmadi. Saqlangan ma'lumotlar ko'rsatilmoqda.",
        });
    } finally {
      state.pending = false;
    }
  }
  return {
    get: (userId: string | null) => (userId ? entry(userId).snapshot : anonymous),
    server: () => empty,
    refresh,
    update(userId: string, update: (value: T) => T) {
      const state = entry(userId);
      state.revision++;
      state.loadedAt = Date.now();
      const value = update(state.snapshot.value);
      publish(userId, { value, loading: false, error: null });
      void idbSet(`${key}_${userId}`, value);
    },
    subscribe(userId: string | null, listener: () => void) {
      if (!userId) return () => {};
      const state = entry(userId);
      state.listeners.add(listener);
      if (Date.now() - state.loadedAt > 30_000) void refresh(userId);
      const onChange = () => {
        void refresh(userId);
      };
      window.addEventListener("aurafit-data-changed", onChange);
      window.addEventListener("online", onChange);
      return () => {
        state.listeners.delete(listener);
        // This subscription owns only the event listeners it registered.
        window.removeEventListener("aurafit-data-changed", onChange);
        window.removeEventListener("online", onChange);
      };
    },
  };
}
export function useUserResource<T>(resource: ReturnType<typeof createUserResource<T>>) {
  const { userId } = useAuth();
  const subscribe = useCallback(
    (listener: () => void) => resource.subscribe(userId, listener),
    [resource, userId],
  );
  const getSnapshot = useCallback(() => resource.get(userId), [resource, userId]);
  return { ...useSyncExternalStore(subscribe, getSnapshot, resource.server), userId };
}
