"use client";

import { useEffect, useRef, useState } from "react";

// Ba'zi yangi mahsulotlar shtrix-kod o'rniga (yoki qo'shimcha) GS1 Digital
// Link QR-kodini bosadi — havola ichida "/01/<GTIN>" segmenti sifatida oddiy
// shtrix-kod raqami yashiringan bo'ladi. Shu segmentni topib olsak, QR-kod
// ham xuddi oddiy shtrix-kod kabi OpenFoodFacts'da qidirilishi mumkin.
function normalizeScannedCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{6,14}$/.test(trimmed)) return trimmed;
  const gs1Match = trimmed.match(/\/01\/(\d{8,14})(?:[/?]|$)/);
  return gs1Match ? gs1Match[1] : trimmed;
}

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let controls: any = null;
    let isMounted = true;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        
        if (!videoRef.current || !isMounted) return;

        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
              // Ba'zi brauzerlar (Ayniqsa Android Chrome) advanced focusSettings ni tushunadi
              // @ts-ignore
              advanced: [{ focusMode: "continuous" }],
            },
          },
          videoRef.current,
          (result, err) => {
            if (result && isMounted) {
              controls?.stop();
              onDetected(normalizeScannedCode(result.getText()));
            }
          }
        );
        if (isMounted) setIsInitializing(false);
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError("Kameraga ruxsat berilmagan yoki qurilmada kamera topilmadi.");
          setIsInitializing(false);
        }
      }
    }

    void startScanner();

    return () => {
      isMounted = false;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="space-y-4">
      {error && (
        <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="relative rounded-xl overflow-hidden h-64 bg-black flex items-center justify-center">
        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <span className="material-symbols-outlined text-4xl text-primary-fixed-dim animate-spin">progress_activity</span>
            <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-widest">
              Kamera ishga tushmoqda...
            </span>
          </div>
        )}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover" 
          muted 
          playsInline 
        />
        {/* Skanerlash ramkasi */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-full h-[120px] border-2 border-primary border-dashed rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-0" />
        </div>
      </div>
      
      <p className="font-label-mono text-[10px] text-on-surface-variant/70 text-center px-4 uppercase">
        Shtrix-kodni qizil ramka markaziga keltiring
      </p>

      <button
        onClick={onClose}
        className="w-full px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono uppercase tracking-wider"
      >
        Bekor Qilish
      </button>
    </div>
  );
}
