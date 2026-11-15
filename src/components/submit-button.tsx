"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Server action formasi uchun tugma: yuborilayotganda darhol "kutilmoqda" holatiga
// o'tadi va bloklanadi — sekin tarmoqda ikki marta bosilib, ikki so'rov ketmaydi.
export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
            progress_activity
          </span>
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
