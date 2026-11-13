import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordServerEvent } from "@/lib/server-telemetry";
export type ApiScope = "scan-food" | "profile-insight" | "workout-recovery" | "lookup-barcode";
export async function authorizeApi(
  scope: ApiScope,
): Promise<{ userId: string; response: null } | { userId: null; response: Response }> {
  const denied = (response: Response) => ({ userId: null, response });
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return denied(NextResponse.json({ error: "Tizimga kiring." }, { status: 401 }));
    const quota = await supabase.rpc("consume_api_limit", { p_scope: scope });
    if (quota.error) {
      recordServerEvent("api_limit_unavailable", { scope });
      return denied(
        NextResponse.json(
          { error: "AI xizmati vaqtincha mavjud emas. Keyinroq urinib ko'ring." },
          { status: 503 },
        ),
      );
    }
    if (!quota.data) {
      recordServerEvent("api_rate_limited", { scope });
      return denied(
        NextResponse.json(
          { error: "So'rovlar chegarasiga yetdingiz. Bir daqiqadan keyin urinib ko'ring." },
          { status: 429, headers: { "Retry-After": "60" } },
        ),
      );
    }
    return { userId: data.user.id, response: null };
  } catch {
    recordServerEvent("api_limit_unavailable", { scope });
    return denied(NextResponse.json({ error: "Xizmat bilan bog'lanib bo'lmadi." }, { status: 503 }));
  }
}
export async function checkApiAccess(scope: ApiScope): Promise<Response | null> {
  return (await authorizeApi(scope)).response;
}
