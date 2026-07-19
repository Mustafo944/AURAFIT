"use client";

import { useState, type ChangeEvent } from "react";

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

// Jonli video oqim (getUserMedia) o'rniga bitta surat orqali skanerlaydi.
// Sabab: brauzerdagi xom kamera oqimida avtofokusni dasturiy nazorat qilish
// (focusMode, zoom, tap-to-focus — barchasi sinab ko'rildi) qurilmadan-
// qurilmaga, ayniqsa Android PWA'da, ishonchsiz chiqdi. "capture" atributini
// ATAYLAB qo'ymaymiz — u ba'zi qurilmalarda telefonni to'g'ridan-to'g'ri
// soddalashtirilgan "tezkor surat" rejimiga olib boradi va makro/yaqin fokus
// rejimini o'chirib qo'yadi. Atributsiz variant standart tanlov oynasini
// ochadi ("Kamera" / "Fayllar"), "Kamera"ni tanlasa foydalanuvchi telefonning
// TO'LIQ kamera ilovasiga (makro rejimi, qo'lda fokus bilan) chiqadi.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (scanning) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      onDetected(normalizeScannedCode(result.getText()));
    } catch {
      setPreviewUrl(null);
      setError(
        "Shtrix-kod yoki QR-kod aniqlanmadi. Telefonni juda yaqinlashtirsangiz kamera xiralashadi — 15-20 sm masofada, yorug' joyda, kod aniq ko'rinadigan holatda qayta suratga oling."
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">{error}</p>
      )}

      {!previewUrl && (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-xl py-12 cursor-pointer hover:border-primary-fixed-dim/50 hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-5xl text-primary-fixed-dim">add_a_photo</span>
          <span className="font-body-md text-body-md text-on-surface-variant text-center px-4">
            Shtrix-kod yoki QR-kodni suratga oling
          </span>
          <span className="font-label-mono text-[10px] text-on-surface-variant/70 text-center px-4">
            &ldquo;Kamera&rdquo; ilovasini tanlang — 15-20 sm masofadan, yorug&apos; joyda suratga oling
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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

      <button
        onClick={onClose}
        className="w-full px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
      >
        Bekor Qilish
      </button>
    </div>
  );
}
