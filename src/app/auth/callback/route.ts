import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase email tasdiqlash/parolni tiklash havolasi shu route'ga qaytadi —
// kodni sessiyaga almashtirib, foydalanuvchini ilovaga kiritadi.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Tasdiqlashda xatolik yuz berdi.")}`);
}
