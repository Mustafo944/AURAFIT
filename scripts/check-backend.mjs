// Read-only schema probes; no rows, credentials or response bodies are printed.
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error("Supabase environment is missing.");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const probes = [
  ["profile training fields", "/rest/v1/profiles?select=id,activity_level,training_preferences&limit=0"],
  ["weight history", "/rest/v1/body_weight_logs?select=id,weight_kg,logged_at&limit=0"],
  ["workout history", "/rest/v1/workout_sessions?select=id,cardio,recovery_advice,progress_advice&limit=0"],
];
for (const [name, path] of probes) {
  try {
    const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(10000) });
    console.log(`${name}: ${response.ok ? "OK" : `unverified (HTTP ${response.status})`}`);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log(`${name}: connection failed`);
    process.exitCode = 1;
  }
}
// Unknown scope is a no-op even if the function is publicly callable. Correct
// deployments reject anonymous execution before entering the function.
try {
  const response = await fetch(`${base}/rest/v1/rpc/consume_api_limit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_scope: "schema-probe-noop" }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({}));
  const protectedFunction = [401, 403].includes(response.status) && body.code === "42501";
  console.log(
    `shared quota RPC: ${protectedFunction ? "present; anonymous execution denied" : `unverified (HTTP ${response.status})`}`,
  );
  if (!protectedFunction) process.exitCode = 1;
} catch {
  console.log("shared quota RPC: connection failed");
  process.exitCode = 1;
}
console.log("Owner RLS policies and authenticated quotas still require database tests or a staging account.");
