import { recordServerEvent } from "@/lib/server-telemetry";
// Abort includes response-body reads: the signal remains attached to the response.
export async function providerFetch(
  provider: "deepseek" | "barcode",
  url: string,
  init: RequestInit,
): Promise<Response> {
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
    if (!response.ok)
      recordServerEvent("provider_failure", {
        scope: provider,
        status: response.status,
        durationMs: Date.now() - started,
      });
    return response;
  } catch {
    recordServerEvent("provider_failure", { scope: provider, status: 504, durationMs: Date.now() - started });
    throw new Error("PROVIDER_UNAVAILABLE");
  }
}
