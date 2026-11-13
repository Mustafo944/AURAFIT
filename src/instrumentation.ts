import type { Instrumentation } from "next";
import { recordServerEvent } from "@/lib/server-telemetry";
export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  recordServerEvent("request_error", { scope: context.routePath, digest });
};
