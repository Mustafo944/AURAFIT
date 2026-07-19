"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";

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
      <Sidebar />
      <MobileHeader />
      {/* Sidebar joyi "padding" bilan ajratiladi (margin emas) — margin-left
          va markazlashtirish uchun margin-auto bir elementda ishlatilsa,
          Tailwind qaysi klass g'olib chiqishiga qarab ba'zi ekran
          kengliklarida sidebar kontentni bosib qolishi mumkin edi. Padding
          bunday ziddiyatga umuman yo'l qo'ymaydi — markazlashtirish esa
          alohida ichki qatlamda, faqat mx-auto bilan, hech qanday klass
          bilan raqobatsiz amalga oshiriladi. */}
      <main className="md:pl-80 pt-20 md:pt-8 pb-24 md:pb-8">
        {/* key={pathname} — har sahifa almashishida .page-enter animatsiyasi
            qayta ishga tushishi uchun (kontent baribir yangi sahifa bo'ladi). */}
        <div key={pathname} className="page-enter max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
          {children}
        </div>
      </main>
      <MobileNav />
    </>
  );
}
