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

// Ba'zi yangi mahsulotlar shtrix-kod o'rniga (yoki qo'shimcha) GS1 Digital
// Link QR-kodini bosadi — havola ichida "/01/<GTIN>" segmenti sifatida oddiy
// shtrix-kod raqami yashiringan bo'ladi. Shu segmentni topib olsak, QR-kod
// ham xuddi oddiy shtrix-kod kabi OpenFoodFacts'da qidirilishi mumkin.
// Boshqa turdagi QR matni (sayt havolasi, reklama va h.k.) o'zgarishsiz
// o'tkaziladi — API baribir uni raqamli bo'lmagani uchun rad etadi.
function normalizeScannedCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{6,14}$/.test(trimmed)) return trimmed;
  const gs1Match = trimmed.match(/\/01\/(\d{8,14})(?:[/?]|$)/);
  return gs1Match ? gs1Match[1] : trimmed;
}

// Ikkita mustaqil detektor parallel ishlaydi:
// 1) Klassik shtrix-kod (EAN/UPC/CODE128) — brauzerning tayyor `BarcodeDetector`
//    API'si mavjud bo'lsa shundan (tez, qo'shimcha kod yuklamaydi).
// 2) QR-kod — har doim @zxing/browser'ning maxsus `BrowserQRCodeReader'i bilan.
//    Sabab: `BarcodeDetector`ga "qr_code" formatini qo'shib so'rasak ham, ba'zi
//    brauzer/OS implementatsiyalari (mas. Windows'dagi Shape Detection polyfill)
//    uni sukut bo'yicha hech qachon aniqlamaydi — shuning uchun QR-kod uchun
//    faqat shtrix-kod API'siga ishonib bo'lmaydi, alohida ishonchli o'quvchi kerak.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // onDetected ref orqali o'qiladi: ota-komponent har render'da yangi funksiya
  // bersa ham (odatiy holat) kamera effekti QAYTA ISHGA TUSHMAYDI. Aks holda
  // sahifadagi istalgan state o'zgarishi kamerani o'chirib-yoqib yuborardi.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

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
        onDetectedRef.current(normalizeScannedCode(code));
      };

      let nativeOk = false;
      if (typeof window !== "undefined" && window.BarcodeDetector) {
        try {
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
          nativeOk = true;
        } catch {
          nativeOk = false;
        }
      }

      // QR-kod uchun har doim ishga tushadi (nativeOk bo'lsa shtrix-kod bilan
      // parallel, aks holda — masalan Safari/Firefox'da — yagona detektor
      // sifatida).
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        if (stopped || !videoRef.current) return;
        zxingControls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) report(result.getText());
        });
      } catch {
        if (!stopped && !nativeOk) setError("Skaner ishga tushmadi.");
      }
    }

    void start();

    return () => {
      stopped = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
          Shtrix-kod yoki QR-kodni ramka ichiga tuting
        </p>
      )}
    </div>
  );
}
