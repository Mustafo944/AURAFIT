import type { Metadata } from "next";
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${archivoNarrow.variable} dark`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background min-h-screen font-body-md selection:bg-primary-container selection:text-on-primary-container antialiased">
        <AuthProvider initialUserId={userId} initialEmail={userEmail}>
          <UserProfileProvider>
            <WorkoutSessionProvider>
              <AppShell>{children}</AppShell>
            </WorkoutSessionProvider>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
