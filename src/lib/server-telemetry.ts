type ServerEvent =
  | "api_limit_unavailable"
  | "api_rate_limited"
  | "provider_failure"
  | "request_error"
  | "ai_attempt"
  | "ai_model_skipped";
// Deliberately exclude URLs, headers, credentials, prompts and profile data.
export function recordServerEvent(
  event: ServerEvent,
  fields: {
    scope?: string;
    status?: number;
    durationMs?: number;
    digest?: string;
    model?: string;
    tokens?: number;
    finishReason?: string;
  },
) {
  const log = event === "ai_model_skipped" || (event === "ai_attempt" && (fields.status ?? 500) < 400)
    ? console.info : console.error;
  log(
    JSON.stringify({ service: "aurafit", event, timestamp: new Date().toISOString(), ...fields }),
  );
}
