import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Supabase manzili muhit o'zgaruvchisidan olinadi: shunda maxsus domen, lokal
// Supabase yoki E2E test serveri ham CSP tomonidan bloklanmaydi.
function originOf(value: string | undefined): string | null {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}
const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseRealtime = supabaseOrigin?.replace(/^http/, "ws") ?? null;

// Content-Security-Policy: faqat o'z domenimiz, Supabase va mashq rasmlari manbalariga ruxsat.
// Next.js sahifa ichiga inline skript qo'yadi (nonce'siz), shu sabab script-src'da
// 'unsafe-inline' kerak; dev rejimida HMR uchun 'unsafe-eval' va ws ham qo'shiladi.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob: https://raw.githubusercontent.com https://lh3.googleusercontent.com", supabaseOrigin]
    .filter(Boolean)
    .join(" "),
  "font-src 'self' data:",
  ["connect-src 'self'", supabaseOrigin, supabaseRealtime, isProduction ? null : "ws: wss:"]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  ...(process.env.AURAFIT_E2E === "1"
    ? { distDir: ".next/e2e", typescript: { tsconfigPath: "tsconfig.e2e.json" } }
    : {}),
  allowedDevOrigins: ["127.0.0.1"],
  reactCompiler: true,
  // Sahifalar ma'lumotni klientda yuklaydi, server faqat yengil "qobiq"
  // beradi — uni 2 daqiqa klient keshida saqlash tablar orasida o'tishni
  // server so'rovisiz, bir zumda qiladi.
  experimental: {
    staleTimes: { dynamic: 120 },
  },
  async headers() {
    return [
      {
        // Barcha sahifa va API javoblari uchun xavfsizlik sarlavhalari.
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/yuhonas/free-exercise-db/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
