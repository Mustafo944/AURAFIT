"use client";
import { taskEntityId, useSyncState } from "@/context/sync-context";
export function SyncStatus({ entityId }: { entityId: string | null }) {
  const { tasks, ready, busy, failed, storageFailed, offline } = useSyncState();
  if (!entityId) return null;
  const pending = tasks.some((task) => taskEntityId(task) === entityId);
  const label = storageFailed
    ? "Saqlashni tekshiring"
    : !ready
      ? "Holat tekshirilmoqda"
      : pending
        ? failed
          ? "Qurilmada saqlandi; qayta yuboriladi"
          : busy
            ? "Serverga yuborilmoqda"
            : "Qurilmada saqlandi"
        : offline
          ? "Saqlangan nusxa"
          : "Serverda saqlangan";
  return (
    <span
      role="status"
      className={`block text-[11px] mt-1 ${(failed && pending) || storageFailed ? "text-error" : "text-on-surface-variant"}`}
    >
      {label}
    </span>
  );
}
