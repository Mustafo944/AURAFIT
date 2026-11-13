"use client";
import { useState } from "react";
import { useWorkoutTemplates } from "@/lib/saved-items";

export function SaveTemplate({ exerciseIds }: { exerciseIds: string[] }) {
  const { items, save, loading } = useWorkoutTemplates();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !exerciseIds.length || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await save([
        ...items,
        { id: crypto.randomUUID(), name: name.trim(), exerciseIds: [...new Set(exerciseIds)] },
      ]);
      setName("");
      setMessage("Shablon shu qurilmada saqlandi.");
    } catch {
      setMessage("Shablonni saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 p-4 space-y-3">
      <label className="block text-sm">
        Mashqlar ro&apos;yxatini shablon sifatida saqlash
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          placeholder="Masalan: Dushanba"
          className="block mt-2 w-full rounded-lg p-3 bg-black border border-white/10"
        />
      </label>
      <button
        disabled={busy || loading || !exerciseIds.length}
        className="rounded-lg px-4 py-2 border border-primary/30 text-primary disabled:opacity-50"
      >
        Shablonni saqlash
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
