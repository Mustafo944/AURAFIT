import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // API handlers independently authenticate users and return JSON 401 responses.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|offline\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|ico|json|js)$).*)",
  ],
};
