"use client";

import { useState, type ReactNode } from "react";
import { signOut } from "@/lib/supabase/actions";

// Chaqiruvchi joyning o'z klass va ichki tarkibini (ikonka + matn) beradi —
// sidebar va profil sahifasidagi ikkita turli uslubdagi qatorda ham
// bir xil tasdiqlash xatti-harakati ishlatilishi uchun.
export function LogoutButton({ className, children }: { className: string; children: ReactNode }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setConfirmOpen(true)} className={className}>
        {children}
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="glass-card rounded-xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error text-2xl">logout</span>
              <h2 id="logout-confirm-title" className="font-headline-md text-headline-md text-primary uppercase italic">
                Chiqishni Tasdiqlang
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Hisobingizdan chiqmoqchimisiz? Qayta kirish uchun email va parolingiz kerak bo&apos;ladi.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono uppercase active:scale-[0.97]"
              >
                Bekor
              </button>
              <form action={signOut} className="flex-1">
                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-lg bg-error text-on-error hover:bg-error/80 transition-colors font-label-mono text-label-mono uppercase active:scale-[0.97]"
                >
                  Ha, Chiqish
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
