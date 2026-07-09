import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

// Har bir so'rovda Supabase sessiya cookie'sini yangilaydi va autentifikatsiya
// qilinmagan foydalanuvchilarni himoyalangan sahifalardan /login ga yo'naltiradi.
// Tasdiqlangan foydalanuvchi ID/email so'rov header'i orqali uzatiladi, shuning
// uchun layout.tsx qayta Supabase'ga murojaat qilib getUser() chaqirmaydi —
// har bir sahifa uchun ikkita o'rniga bitta tarmoq so'rovi yetarli bo'ladi.
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasAuthCookie(request)) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user) {
    requestHeaders.set("x-supabase-user-id", user.id);
    if (user.email) requestHeaders.set("x-supabase-user-email", user.email);
    const withUserHeaders = NextResponse.next({ request: { headers: requestHeaders } });
    supabaseResponse.cookies.getAll().forEach((cookie) => withUserHeaders.cookies.set(cookie));
    supabaseResponse = withUserHeaders;
  }

  return supabaseResponse;
}
