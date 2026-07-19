"use client";

import { useState, useRef, type ChangeEvent } from "react";

// GS1 Digital Link QR-kod ichida yashiringan GTIN'ni topadi
function normalizeScannedCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{6,14}$/.test(trimmed)) return trimmed;
  const gs1Match = trimmed.match(/\/01\/(\d{8,14})(?:[/?]|$)/);
  return gs1Match ? gs1Match[1] : trimmed;
}

// Rasm sifatini oshirish: canvas orqali kontrast va o'tkir qilib qayta chiziladi,
// shunda ZXing xira yoki kichik shtrix-kodlarni ham aniq taniy oladi.
async function preprocessImage(objectUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Piksell zichligini oshirish — ZXing aniqroq o'qiydi
      const scale = Math.min(2, 1600 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // Kontrast va o'tkir filtr — xira shtrix-kodlarni aniqlashtiradi
      ctx.filter = "contrast(1.4) brightness(1.1) saturate(0)";
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = objectUrl;
  });
}

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (scanning) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const rawUrl = URL.createObjectURL(file);
    setPreviewUrl(rawUrl);
    setError(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      // Avval asl rasmdan urinib ko'ramiz
      let result = await reader.decodeFromImageUrl(rawUrl).catch(() => null);

      // Agar topilmasa, canvas preprocessdan o'tkazib qayta urinamiz
      if (!result) {
        const enhanced = await preprocessImage(rawUrl);
        result = await reader.decodeFromImageUrl(enhanced).catch(() => null);
      }

      if (result) {
        onDetected(normalizeScannedCode(result.getText()));
      } else {
        setPreviewUrl(null);
        setError(
          "Shtrix-kod aniqlanmadi. Yorug' joyda, 15–25 sm masofada, kod to'liq ko'rinadigan holatda qayta suratga oling."
        );
      }
    } catch {
      setPreviewUrl(null);
      setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {!previewUrl && (
        <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/15 rounded-xl py-12 cursor-pointer hover:border-primary-fixed-dim/50 hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-5xl text-primary-fixed-dim">qr_code_scanner</span>
          <div className="text-center px-4 space-y-1">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Shtrix-kodni suratga oling yoki galeredan tanlang
            </p>
            <p className="font-label-mono text-[10px] text-on-surface-variant/60">
              15–25 sm masofadan, yorug&apos; joyda, kod to&apos;liq ko&apos;rinadigan holatda
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} className="w-full h-full object-cover" alt="Skanerlangan kod" />
          {scanning && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary-fixed-dim animate-spin">progress_activity</span>
              <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-widest">
                Kod Aniqlanmoqda...
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {previewUrl && !scanning && (
          <button
            onClick={() => { setPreviewUrl(null); setError(null); }}
            className="flex-1 px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono uppercase"
          >
            Qayta Urinish
          </button>
        )}
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono uppercase"
        >
          Bekor Qilish
        </button>
      </div>
    </div>
  );
}
