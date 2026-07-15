"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { useUserProfile } from "@/context/user-profile-context";

export function MobileHeader() {
  const { profile } = useUserProfile();

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(171,214,0,0.1)] flex justify-between items-center px-margin-mobile h-16 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="w-7 h-7 drop-shadow-[0_0_6px_rgba(195,244,0,0.5)]" />
        <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary uppercase italic">
          AuraFit
        </span>
      </Link>
      <Link
        href="/profile"
        className="w-8 h-8 rounded-full overflow-hidden border border-white/20 relative bg-surface-container-high flex items-center justify-center"
      >
        {profile.avatarUrl ? (
          <Image alt="Foydalanuvchi rasmi" fill sizes="32px" className="object-cover" src={profile.avatarUrl} />
        ) : (
          <span className="material-symbols-outlined text-base text-on-surface-variant">person</span>
        )}
      </Link>
    </header>
  );
}
