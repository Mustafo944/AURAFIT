"use client";
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section role="alert" className="glass-card rounded-xl p-8 space-y-4">
      <h1 className="font-headline-md text-2xl text-primary">Sahifani ochib bo&apos;lmadi</h1>
      <p className="text-on-surface-variant">
        Qayta urinib ko&apos;ring. Saqlangan ma&apos;lumotlaringiz o&apos;chirilmaydi.
      </p>
      {error.digest && <p className="text-xs text-on-surface-variant">Xato kodi: {error.digest}</p>}
      <button onClick={retry} className="bg-primary-container text-on-primary-container rounded-lg px-5 py-3">
        Qayta urinish
      </button>
    </section>
  );
}
