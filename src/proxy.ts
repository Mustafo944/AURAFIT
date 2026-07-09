import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // API route'lar Supabase sessiyasini o'zi tekshirmaydi (faqat rate-limit
  // bilan himoyalangan, holatsiz AI proksilar) — ularni proxy'dan chiqarib
  // qo'yish har bir AI so'rovidan bitta keraksiz tarmoq aylanishini olib tashlaydi.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
