"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// SSR va hydration renderida false, klientda mount tugagach true bo'ladi.
// localStorage kabi faqat-klient manbalarni hydration mosligini buzmasdan
// (server HTML bilan birinchi klient render bir xil chiqishi shart) render
// vaqtida o'qish uchun ishlatiladi.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
