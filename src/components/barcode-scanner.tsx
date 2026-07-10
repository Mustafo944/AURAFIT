"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

// Progressiv yaxshilash: avval brauzerning tayyor `BarcodeDetector` API'si
// sinaladi (Chrome/Android'da tezkor, qo'shimcha kod yuklamaydi). Mavjud
// bo'lmasa (Safari/Firefox) `@zxing/browser` faqat shu holatda dinamik
// import qilinadi — qo'llab-quvvatlaydigan brauzerlar uchun bundle og'irligi
// qo'shilmaydi.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let zxingControls: { stop: () => void } | null = null;
    let rafId: number | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        if (!stopped) setError("Kameraga ruxsat berilmadi yoki kamera topilmadi.");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (videoRef.current) videoRef.current.srcObject = stream;

      const report = (code: string) => {
        if (detectedRef.current || stopped) return;
        detectedRef.current = true;
        onDetected(code);
      };

      if (typeof window !== "undefined" && window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
        const tick = async () => {
          if (stopped || detectedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]) {
              report(codes[0].rawValue);
              return;
            }
          } catch {
            // frame o'qilmadi — keyingi frame'da qayta urinamiz
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } else {
        try {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          if (stopped || !videoRef.current) return;
          zxingControls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) report(result.getText());
          });
        } catch {
          if (!stopped) setError("Shtrix-kod skaneri ishga tushmadi.");
        }
      }
    }

    void start();

    return () => {
      stopped = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden h-64 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-8 border-2 border-primary-fixed-dim/60 rounded-lg pointer-events-none" />
        <button
          onClick={onClose}
          aria-label="Yopish"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-on-surface flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      {error ? (
        <p className="font-body-md text-[13px] text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">{error}</p>
      ) : (
        <p className="font-label-mono text-label-mono text-on-surface-variant text-center uppercase tracking-widest">
          Shtrix-kodni ramka ichiga tuting
        </p>
      )}
    </div>
  );
}
