"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useSyncState } from "@/context/sync-context";

export function DataManagement() {
  const { userId } = useAuth();
  // Checked again via auth.getUser by the exporter before returning data.
  const { tasks, ready, offline, busy, failed, storageFailed, retry } = useSyncState();
  const [exporting, setExporting] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const download = async () => {
    if (!userId || lock.current) return;
    lock.current = true;
    setExporting(true);
    setMessage("");
    try {
      const { exportAccountData } = await import("@/lib/export-data");
      const data = await exportAccountData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aurafit-${data.exportedAt.slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Ma'lumotlar eksport qilindi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Eksport amalga oshmadi.");
    } finally {
      lock.current = false;
      setExporting(false);
    }
  };
  return (
    <section className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="font-headline-md text-xl text-primary">Ma&apos;lumotlarim</h3>
      <p role="status" className="text-sm text-on-surface-variant">
        {storageFailed
          ? "Qurilma xotirasini o'qib bo'lmadi."
          : !ready
            ? "Saqlash holati tekshirilmoqda..."
            : `${tasks.length} ta o'zgarish serverga yuborilishini kutmoqda.${offline ? " Internet uzilgan." : failed ? " Qayta yuborish kerak." : busy ? " Yuborilmoqda..." : ""}`}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={retry}
          disabled={busy || offline || !ready}
          className="rounded-lg border border-primary/30 px-4 py-3 text-sm text-primary disabled:opacity-50"
        >
          Sinxronlashni tekshirish
        </button>
        <button
          onClick={() => void download()}
          disabled={!userId || exporting || offline}
          className="rounded-lg bg-primary text-black px-4 py-3 text-sm disabled:opacity-50"
        >
          {exporting ? "Eksport tayyorlanmoqda..." : "Ma'lumotlarni eksport qilish"}
        </button>
      </div>
      <p className="text-xs text-on-surface-variant">
        JSON faylga serverdagi barcha yozuvlar, shu qurilmadagi shablonlar, sevimli mashqlar va kutilayotgan
        o&apos;zgarishlar alohida saqlanadi. Eksport uchun internet kerak.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
