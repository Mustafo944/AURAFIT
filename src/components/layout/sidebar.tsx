"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useAuth } from "@/context/auth-context";
import { signOut } from "@/lib/supabase/actions";

const navItems = [
  { href: "/", label: "ASOSIY", icon: "grid_view" },
  { href: "/workouts", label: "MASHG'ULOTLAR", icon: "fitness_center" },
  { href: "/analytics", label: "TAHLIL", icon: "restaurant" },
];

const secondaryItems = [
  { href: "#", label: "Mashg'ulot Tarixi", icon: "history" },
  { href: "#", label: "Bio-Ma'lumot Sinxronizatsiyasi", icon: "sync" },
  { href: "#", label: "AI Murabbiy Sozlamalari", icon: "psychology" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { email } = useAuth();

  return (
    <aside className="hidden md:flex flex-col h-screen w-80 bg-surface-container-high border-r border-white/5 shadow-2xl py-stack-lg fixed left-0 top-0 z-40">
      {/* Brand */}
      <Link href="/" className="px-gutter mb-stack-lg flex items-center gap-2">
        <Logo className="w-8 h-8 drop-shadow-[0_0_6px_rgba(195,244,0,0.5)]" />
        <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary uppercase italic">
          AuraFit
        </span>
      </Link>

      {/* Profile Header */}
      <div className="px-gutter mb-stack-lg flex items-center gap-4">
        <Link
          href="/profile"
          className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-fixed-dim shrink-0 relative"
        >
          <Image
            alt="Foydalanuvchi avatari"
            fill
            sizes="48px"
            className="object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAanJzpkrbQECXO8kpmSpYgRWDuWm0aL6-NC_Pw3F2phCm9j_D_c-FA4F1gnpOvyUrbqQPp8oPyUOHq27XstnEYDbOBTdJscDDrlShDqplwgsYPnHGdp1v8hvEO91Dk9CrOOFb7xPH7huTm396wMEBcMTtYZ-bW5eZCv3M1nJ0o6mbnf3iEzz1savcBi4iyfT898ToaEn1NEP4nhCtJbBm_ic6dP0hCYRmGmYZU6nEz_ZLTZYX5YsbR"
          />
        </Link>
        <div>
          <Link
            href="/profile"
            className="font-headline-md text-headline-md text-primary font-bold uppercase italic hover:text-primary-fixed-dim transition-colors truncate block max-w-[160px]"
          >
            {email ?? "ATHLETE_01"}
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-label-mono text-label-mono text-on-surface-variant">Pro Daraja</span>
            <span className="font-label-mono text-[10px] text-tertiary-fixed-dim px-1.5 py-0.5 rounded border border-tertiary-fixed-dim/30">
              V0.2.4-BETA
            </span>
          </div>
        </div>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-on-surface-variant hover:bg-white/5"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md font-medium">{item.label}</span>
            </Link>
          );
        })}

        <div className="my-4 border-t border-white/5" />

        {secondaryItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors duration-200"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-md text-body-md">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 mt-auto space-y-2">
        <Link
          href="/profile"
          className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-200 ${
            pathname === "/profile"
              ? "bg-primary/10 text-primary border-l-4 border-primary"
              : "text-on-surface-variant hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="font-body-md text-body-md">Profil</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors duration-200 w-full"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-body-md text-body-md">Chiqish</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
