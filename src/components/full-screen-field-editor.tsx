import type { ReactNode } from "react";

interface FullScreenFieldEditorProps {
  title: string;
  icon: string;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}

// FitAI-uslubidagi to'liq ekran maydon muharriri — orqaga tugmasi, sarlavha,
// markazda widget, pastda "Saqlash". `fixed inset-0` orqali butun oynani
// (sidebar/pastki menyu bilan birga) qoplaydi.
export function FullScreenFieldEditor({ title, icon, onClose, onSave, children }: FullScreenFieldEditorProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex items-center gap-4 px-margin-mobile md:px-margin-desktop py-5 border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Orqaga"
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center text-on-surface-variant shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <span className="material-symbols-outlined text-primary-fixed-dim">{icon}</span>
        <h2 className="font-headline-md text-headline-md text-primary uppercase italic">{title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-margin-mobile py-8">
        <div className="w-full max-w-sm">
          {/* Aylanuvchi/porlovchi dekorativ SVG — odam rasmi o'rniga loyihaning
              o'z uslubida (abstrakt, radar-uslubidagi glow), shu maydonning
              ikonkasi markazda. */}
          <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-fixed-dim/30 animate-[spin_14s_linear_infinite]" />
            <div className="absolute inset-3 rounded-full border border-tertiary-fixed-dim/25 animate-[spin_10s_linear_infinite_reverse]" />
            <div className="absolute inset-6 rounded-full border border-primary-fixed-dim/20 animate-ping [animation-duration:2.5s]" />
            <div className="absolute inset-8 rounded-full bg-primary-container/15 blur-2xl" />
            <div className="relative w-20 h-20 rounded-full bg-surface-container-high/80 border border-primary-fixed-dim/40 flex items-center justify-center shadow-[0_0_30px_rgba(195,244,0,0.3)]">
              <span className="material-symbols-outlined text-primary-fixed-dim text-[36px]">{icon}</span>
            </div>
          </div>
          {children}
        </div>
      </div>

      <div className="px-margin-mobile md:px-margin-desktop py-5 border-t border-white/10 shrink-0">
        <button
          type="button"
          onClick={onSave}
          className="w-full max-w-sm mx-auto block bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider py-4 rounded-lg glow-button hover:bg-primary-fixed transition-colors"
        >
          Saqlash
        </button>
      </div>
    </div>
  );
}
