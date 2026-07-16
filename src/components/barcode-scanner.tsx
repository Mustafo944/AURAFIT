"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

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

// Ham shtrix-kod (EAN/UPC/CODE128), ham QR-kodni @zxing/browser'ning yagona
// `BrowserMultiFormatReader'i bilan o'qiymiz. Ilgari 1D shtrix-kod uchun
// brauzerning native `BarcodeDetector` API'siga tayanardik — biroq u Windows'dagi
// Chrome, Firefox va Safari'da umuman mavjud emas, shuning uchun ko'p qurilmada
// shtrix-kod hech qachon aniqlanmasdi. zxing esa har qanday brauzerda, faqat
// JS bilan, kadrma-kadr dekod qiladi — bu barcha platformada barqaror ishlaydi.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

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

    async function start() {
      // Standart cheklovlar (faqat facingMode) ba'zi kameralarda past
      // aniqlikda va fokussiz oqim ochadi — shtrix-kod/QR o'qish uchun
      // deyarli imkonsiz. Yuqori o'lcham va davomiy avtofokusni so'raymiz;
      // "focusMode" TS turlarida yo'q (kengaytirilgan, standart bo'lmagan
      // Image Capture cheklovi), lekin "advanced" ichida qo'llab-quvvatlamaydigan
      // brauzerlar jimgina e'tiborsiz qoldiradi.
      const enhancedConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...({ advanced: [{ focusMode: "continuous" }] } as object),
        },
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia(enhancedConstraints);
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch {
          if (!stopped) setError("Kameraga ruxsat berilmadi yoki kamera topilmadi.");
          return;
        }
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Ba'zi brauzerlarda avtofokus faqat trek olingandan keyin
      // applyConstraints orqali yoqiladi (getUserMedia paytida e'tiborsiz
      // qoldirilgan bo'lishi mumkin). Qo'llab-quvvatlanmasa jimgina o'tkaziladi.
      const [track] = stream.getVideoTracks();
      trackRef.current = track ?? null;
      if (track) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints);
        } catch {
          // fokus rejimi qo'llab-quvvatlanmaydi — sukut bo'yicha davom etiladi
        }
      }

      const report = (code: string) => {
        if (detectedRef.current || stopped) return;
        detectedRef.current = true;
        onDetectedRef.current(normalizeScannedCode(code));
      };

      // Yagona ko'p-formatli o'quvchi: ham QR, ham chiziqli shtrix-kodlar.
      // Formatlarni cheklaymiz — tezroq ishlaydi va tasodifiy noto'g'ri
      // o'qishlar kamayadi (faqat oziq-ovqat qadoqlarida uchraydigan turlar).
      try {
        const { BrowserMultiFormatReader, BarcodeFormat } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        reader.possibleFormats = [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ];
        if (stopped || !videoRef.current) return;
        // decodeFromVideoElement kadrma-kadr uzluksiz dekod qiladi; kod
        // topilmagan har bir kadr uchun callback'ga (kutilgan) NotFound xatosi
        // keladi — uni e'tiborsiz qoldiramiz, faqat natijaga qaraymiz.
        zxingControls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) report(result.getText());
        });
      } catch {
        if (!stopped) setError("Skaner ishga tushmadi.");
      }
    }

    void start();

    return () => {
      stopped = true;
      trackRef.current = null;
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Avtofokus har doim ham to'g'ri nuqtaga qarab tushmasligi mumkin —
  // foydalanuvchi shtrix-kod/QR ustiga bossa, kamerani aynan o'sha nuqtaga
  // qayta fokuslashga urinamiz (telefon kamera ilovalaridagi kabi).
  // Qo'llab-quvvatlanmasa (masalan Safari) jimgina e'tiborsiz qoldiriladi.
  const handleTapToFocus = (e: MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 700);
    void track
      .applyConstraints({
        advanced: [{ focusMode: "continuous", pointsOfInterest: [{ x, y }] }],
      } as unknown as MediaTrackConstraints)
      .catch(() => {
        // qo'lda fokus qo'llab-quvvatlanmaydi — sukut bo'yicha e'tiborsiz qoldiriladi
      });
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden h-64 bg-black cursor-crosshair" onClick={handleTapToFocus}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-8 border-2 border-primary-fixed-dim/60 rounded-lg pointer-events-none" />
        {focusPoint && (
          <div
            className="absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-2 border-primary-fixed-dim pointer-events-none animate-ping"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
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
          Shtrix-kod yoki QR-kodni ramka ichiga tuting — fokus uchun ekranga bosing
        </p>
      )}
    </div>
  );
}
