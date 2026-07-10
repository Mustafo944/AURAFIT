import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Archivo_Narrow } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { UserProfileProvider } from "@/context/user-profile-context";
import { WorkoutSessionProvider } from "@/context/workout-session-context";
import { AuthProvider } from "@/context/auth-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraFit — AI-Powered Fitness",
  description: "Premium AI-driven fitness. Precision training, data-driven insights, futuristic interface for peak performance.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AuraFit",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#C3F400",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts allaqachon Supabase orqali sessiyani tekshirib bo'lgan — bu yerda
  // qayta tarmoq so'rovi yubormasdan, u qoldirgan header'dan foydalanuvchini o'qiymiz.
  const headersList = await headers();
  const userId = headersList.get("x-supabase-user-id");
  const userEmail = headersList.get("x-supabase-user-email");

  return (
    <html
      lang="uz"
      translate="no"
      className={`${inter.variable} ${jetbrainsMono.variable} ${archivoNarrow.variable} dark`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Brauzer (Chrome) sahifani boshqa tilga tarjima qilishni har safar
            qayta taklif qilib turishining oldini oladi — dinamik/skeleton
            kontent DOM'ni o'zgartirganda tarjima paneli takroran chiqib
            qolmasin uchun. */}
        <meta name="google" content="notranslate" />
      </head>
      <body className="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-on-primary-container antialiased">
        <AuthProvider initialUserId={userId} initialEmail={userEmail}>
          <UserProfileProvider>
            <WorkoutSessionProvider>
              <AppShell>{children}</AppShell>
            </WorkoutSessionProvider>
          </UserProfileProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === "production"
                ? `
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                      navigator.serviceWorker.register('/sw.js');
                    });
                  }
                `
                : `
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((regs) => {
                      regs.forEach((reg) => reg.unregister());
                    });
                    if (window.caches) {
                      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
                    }
                  }
                `,
          }}
        />
      </body>
    </html>
  );
}
