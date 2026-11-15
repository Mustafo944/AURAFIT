"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { parseResendAt } from "@/lib/auth-input";

// "Kodni qayta yuborish": Supabase bir emailga 60 soniyada bir marta ruxsat beradi,
// shuning uchun ruxsat vaqtigacha qolgan soniyalar jonli sanaladi va tugma bloklanadi.
// Vaqt faqat brauzerda hisoblanadi (server bilan farq hydration xatosiga olib kelmasin).
export function ResendCodeButton({ resendAt }: { resendAt: string | null }) {
  const { pending } = useFormStatus();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const until = now === null ? null : parseResendAt(resendAt, now);
  const remaining = until !== null && now !== null ? Math.ceil((until - now) / 1000) : 0;
  // Sahifa endigina ochilganda (vaqt hali hisoblanmagan) ham erta bosib bo'lmasin.
  const waiting = now === null ? Boolean(resendAt) : remaining > 0;

  return (
    <button
      type="submit"
      disabled={pending || waiting}
      aria-busy={pending}
      className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors underline underline-offset-4 disabled:no-underline disabled:text-on-surface-variant disabled:cursor-not-allowed"
    >
      {pending
        ? "Yuborilmoqda..."
        : remaining > 0
          ? `Qayta yuborish: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
          : "Kodni qayta yuborish"}
    </button>
  );
}
