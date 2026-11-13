"use client";

import type { ReactNode } from "react";

// Ixcham ochiladigan panel: yopiq holda bitta qator (ikonka + sarlavha + o'q),
// bosilganda kontent silliq ochiladi. Balandlik animatsiyasi CSS-grid
// (0fr ↔ 1fr) orqali — JS bilan o'lchash shart emas.
export function CollapsiblePanel({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="glass-card rounded-xl" aria-label={title}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <span className="material-symbols-outlined text-primary-fixed-dim text-[22px]">{icon}</span>
        <span className="flex-1 font-headline-md text-[17px] text-primary uppercase">{title}</span>
        <span
          className={`material-symbols-outlined text-on-surface-variant text-[22px] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          inert={!open}
          className={`overflow-hidden min-h-0 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        >
          <div className="px-5 pb-5 pt-4 space-y-4 border-t border-white/10">{children}</div>
        </div>
      </div>
    </section>
  );
}
