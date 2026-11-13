"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ASOSIY", icon: "grid_view" },
  { href: "/workouts", label: "MASHG'ULOT", icon: "fitness_center" },
  { href: "/analytics", label: "DIETA", icon: "restaurant" },
  { href: "/profile", label: "PROFIL", icon: "person" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-3xl bg-surface-container/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] flex justify-around items-center h-20 px-4 md:hidden will-change-transform">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 duration-200 ease-out relative ${
              isActive
                ? "text-primary drop-shadow-[0_0_10px_rgba(195,244,0,0.6)]"
                : "text-on-surface-variant/60 hover:text-primary/80"
            }`}
          >
            {isActive && (
              <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-primary-fixed-dim shadow-[0_0_8px_#c3f400]" />
            )}
            <span
              className="material-symbols-outlined text-[24px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className={`font-label-mono text-[10px] tracking-wider uppercase mt-1 ${isActive ? "font-bold text-primary" : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
