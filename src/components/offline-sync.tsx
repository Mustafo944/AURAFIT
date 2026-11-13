"use client";
import { useSyncState } from "@/context/sync-context";
export function OfflineSyncManager() {
  const { offline, busy, failed, storageFailed, tasks, retry } = useSyncState();
  if (!offline && !busy && !failed && !storageFailed && !tasks.length) return null;
  const message = storageFailed
    ? "Qurilmaga saqlab bo'lmadi. Sahifani yopmang; xotira ruxsatlarini tekshiring."
    : failed
      ? "Serverga yuborilmadi. Ma'lumotlar qurilmada saqlangan."
      : offline
        ? "Siz oflaynsiz. Ma'lumotlar qurilmada saqlanadi."
        : busy
          ? "Sinxronlanmoqda..."
          : "Yuborish kutilmoqda...";
  return (
    <div className="fixed top-16 md:top-0 inset-x-0 z-[60] flex justify-center p-2 pointer-events-none">
      <div className="pointer-events-auto max-w-xl rounded-xl bg-surface-container-high border border-white/20 shadow-lg px-4 py-2 text-xs flex items-center gap-3">
        <span role="status">
          {message}
          {tasks.length > 0 ? ` (${tasks.length})` : ""}
        </span>
        {(failed || storageFailed) && (
          <button
            type="button"
            disabled={busy || offline}
            onClick={retry}
            className="shrink-0 text-primary underline disabled:opacity-50"
          >
            Qayta urinish
          </button>
        )}
      </div>
    </div>
  );
}
