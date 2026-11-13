"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OfflineSyncManager } from "@/components/offline-sync";

const AUTH_ROUTES = ["/login", "/signup"];

// Login/signup sahifalarida sidebar, mobil header va pastki navigatsiya
// ko'rsatilmaydi — bu sahifalar hali autentifikatsiya qilinmagan holatda ochiladi.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (AUTH_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <OfflineSyncManager />
      {/* Futuristik Ambient Aura foni — minimal GPU yuklamasi, silliq neon muhit */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="ambient-orb-primary -top-20 right-1/4 w-[450px] h-[450px]" />
        <div className="ambient-orb-cyan top-1/2 -left-20 w-[380px] h-[380px]" />
        <div className="ambient-orb-primary -bottom-24 right-10 w-[500px] h-[500px]" />
      </div>
      <Sidebar />
      <MobileHeader />
      {/* Sidebar joyi "padding" bilan ajratiladi (margin emas) — margin-left
          va markazlashtirish uchun margin-auto bir elementda ishlatilsa,
          Tailwind qaysi klass g'olib chiqishiga qarab ba'zi ekran
          kengliklarida sidebar kontentni bosib qolishi mumkin edi. Padding
          bunday ziddiyatga umuman yo'l qo'ymaydi — markazlashtirish esa
          alohida ichki qatlamda, faqat mx-auto bilan, hech qanday klass
          bilan raqobatsiz amalga oshiriladi. */}
      <main className="md:pl-80 pt-[calc(5rem+env(safe-area-inset-top))] md:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 relative z-0">
        <div className="page-enter max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
          {children}
        </div>
      </main>
      <MobileNav />
    </>
  );
}
