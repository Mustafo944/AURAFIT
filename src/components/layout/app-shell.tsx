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
      <main className="md:ml-80 pt-20 md:pt-8 pb-24 md:pb-8 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto w-full">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
