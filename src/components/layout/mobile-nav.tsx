"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ASOSIY", icon: "grid_view" },
  { href: "/workouts", label: "MASHG'ULOTLAR", icon: "fitness_center" },
  { href: "/analytics", label: "TAHLIL", icon: "restaurant" },
  { href: "/profile", label: "PROFIL", icon: "person" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-3xl bg-surface-container/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-20 px-4 md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-300 ease-out ${
              isActive
                ? "text-primary drop-shadow-[0_0_8px_rgba(171,214,0,0.5)]"
                : "text-on-surface-variant/50 hover:text-primary/80"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className={`font-label-mono text-label-mono uppercase mt-1 ${isActive ? "font-bold" : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
