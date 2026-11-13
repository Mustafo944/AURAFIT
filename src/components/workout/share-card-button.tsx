"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { renderShareCard, type ShareCardData, type ShareCardFonts } from "@/lib/share-card";

const FILE_NAME = "aurafit-natija.png";

// next/font shriftlari CSS o'zgaruvchilari orqali beriladi — Canvas'ga aynan
// shu oilalarni berib, chizishdan oldin yuklanganini kutamiz (aks holda rasm
// oddiy shriftda chiqib qoladi).
async function loadFonts(): Promise<ShareCardFonts> {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const fonts = {
    display: read("--font-archivo-narrow", "'Arial Narrow', sans-serif"),
    body: read("--font-inter", "system-ui, sans-serif"),
    mono: read("--font-jetbrains-mono", "monospace"),
  };
  await Promise.all(
    [
      `italic 700 100px ${fonts.display}`,
      `600 40px ${fonts.body}`,
      `400 26px ${fonts.body}`,
      `500 30px ${fonts.mono}`,
      `700 40px ${fonts.mono}`,
    ].map((font) => document.fonts.load(font).catch(() => [])),
  );
  return fonts;
}

export function ShareCardButton({ data }: { data: ShareCardData }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderShareCard(data, await loadFonts());
      setFile(new File([blob], FILE_NAME, { type: "image/png" }));
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError("Rasmni tayyorlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setPreviewUrl(null);
    setFile(null);
  };

  const canShareFile =
    !!file && typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "AuraFit natijam" });
    } catch (e) {
      // Foydalanuvchi oynani yopsa AbortError keladi — bu xato emas.
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Ulashib bo'lmadi. Rasmni yuklab oling.");
    }
  };

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = FILE_NAME;
    a.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container px-4 py-3 font-label-mono text-label-mono uppercase tracking-wider glow-button hover:bg-primary-fixed transition-colors disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">{busy ? "progress_activity" : "ios_share"}</span>
        {busy ? "Tayyorlanmoqda..." : "Natijani ulashish"}
      </button>
      {error && !previewUrl && <p className="text-error text-sm">{error}</p>}

      {previewUrl &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Natija kartochkasi"
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            onClick={close}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Mashg'ulot natijasi kartochkasi"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[68dvh] w-auto max-w-full rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(195,244,0,0.18)]"
            />
            <div className="w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
              {canShareFile && (
                <button
                  type="button"
                  onClick={() => void share()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container py-3.5 font-label-mono text-label-mono uppercase tracking-wider glow-button"
                >
                  <span className="material-symbols-outlined text-[18px]">ios_share</span>
                  Telegram / Instagram&apos;ga ulashish
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-3 text-on-surface font-label-mono text-[12px] uppercase"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Yuklab olish
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-white/15 py-3 text-on-surface-variant font-label-mono text-[12px] uppercase"
                >
                  Yopish
                </button>
              </div>
              {error && <p className="text-error text-sm text-center">{error}</p>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
