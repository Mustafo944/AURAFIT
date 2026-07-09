"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";

export function MobileHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(171,214,0,0.1)] flex justify-between items-center px-margin-mobile h-16 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="w-7 h-7 drop-shadow-[0_0_6px_rgba(195,244,0,0.5)]" />
        <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary uppercase italic">
          AuraFit
        </span>
      </Link>
      <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-white/20 relative">
        <Image
          alt="Foydalanuvchi rasmi"
          fill
          sizes="32px"
          className="object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQ900h2dADQvms2NKrObMPF1sIlA5Gro6_yi6J-_y-Y7o6AH66US53XMJOv1ZTXAvxjHOnaoQB4lWlU9MI2q0aOVRESt80ITfxclsJxhiY4Qq2AmYZnWRyH-G32W4cOdW1m2cKZrxRG56ubZrSfhnVu_OmwskH2Q6x03htYb35jzaiV9P08dkS-1eoNigbCRrVJbMuhoZDlKx9Hl3sIq8Y2pipiEHrSv86MSuXm_4I3ef5bWDUg4dS"
        />
      </Link>
    </header>
  );
}
