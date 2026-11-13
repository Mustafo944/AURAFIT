// Local test backend only. Never used by the application or deployed.
import http from "node:http";
const USER = "11111111-1111-4111-8111-111111111111";
const user = (id) => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.com",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
});
const token = (id) =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", email: "test@example.com", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString("base64url")}.test-signature`;
const session = (id) => ({
  access_token: token(id),
  refresh_token: "fixture-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: user(id),
});
let failWrites = false;
let rows = {};
function reset() {
  failWrites = false;
  rows = {
    profiles: [
      {
        id: USER,
        first_name: "Test",
        last_name: "Athlete",
        age: 28,
        gender: "male",
        weight_kg: 80,
        height_cm: 180,
        goal: "maintain",
        target_weight_kg: null,
        avatar_url: null,
        activity_level: "moderate",
        training_preferences: {
          experience: "beginner",
          equipment: ["barbell", "dumbbell", "bodyweight", "machine", "cable"],
          daysPerWeek: 3,
        },
      },
    ],
    workout_sessions: [],
    body_weight_logs: [],
    meals: [],
  };
}
reset();
http
  .createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin ?? "http://127.0.0.1:3100");
    response.setHeader(
      "Access-Control-Allow-Headers",
      request.headers["access-control-request-headers"] ?? "authorization,apikey,content-type",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Content-Type", "application/json");
    const send = (status, value) => {
      response.statusCode = status;
      response.end(JSON.stringify(value));
    };
    if (request.method === "OPTIONS") return send(200, {});
    const url = new URL(request.url, "http://127.0.0.1:54329");
    let body = "";
    for await (const chunk of request) body += chunk;
    let input = {};
    try {
      input = body ? JSON.parse(body) : {};
    } catch {
      return send(400, {});
    }
    if (url.pathname === "/__test/reset") {
      reset();
      return send(200, {});
    }
    if (url.pathname === "/__test/session") return send(200, session(url.searchParams.get("user") ?? USER));
    if (url.pathname === "/__test/fail") {
      failWrites = input.enabled;
      return send(200, {});
    }
    if (url.pathname === "/__test/seed" && Object.hasOwn(rows, input.table)) {
      rows[input.table] = input.rows;
      return send(200, {});
    }
    if (url.pathname === "/__test/rows") return send(200, rows);
    let id;
    try {
      id = JSON.parse(
        Buffer.from((request.headers.authorization ?? "").split(".")[1], "base64url").toString(),
      ).sub;
    } catch {}
    if (url.pathname === "/auth/v1/token") return send(200, session(USER));
    if (url.pathname === "/auth/v1/user")
      return id ? send(200, user(id)) : send(401, { message: "No session" });
    if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(200, { keys: [] });
    if (url.pathname === "/auth/v1/logout") return send(200, {});
    if (url.pathname === "/rest/v1/rpc/consume_api_limit") return send(200, !!id);
    const table = url.pathname.split("/").at(-1);
    if (!id || !Object.hasOwn(rows, table)) return send(404, {});
    if (request.method !== "GET" && failWrites)
      return send(503, { message: "Fixture write unavailable", code: "TEST_FAILURE" });
    const owned = (row) => (table === "profiles" ? row.id : row.user_id) === id;
    const filtered = (row) => {
      if (!owned(row)) return false;
      const cursor = url.searchParams.get("or");
      if (cursor) {
        const time = cursor.match(/finished_at\.lt\.([^,]+)/)?.[1];
        const cursorId = cursor.match(/id\.lt\.([^)]+)/)?.[1];
        if (time && !(row.finished_at < time || (row.finished_at === time && row.id < cursorId)))
          return false;
      }
      for (const [key, value] of url.searchParams) {
        if (value.startsWith("eq.") && String(row[key]) !== value.slice(3)) return false;
        if (value.startsWith("gt.") && String(row[key]) <= value.slice(3)) return false;
        if (value.startsWith("gte.") && String(row[key]) < value.slice(4)) return false;
        if (value.startsWith("lt.") && String(row[key]) >= value.slice(3)) return false;
      }
      return true;
    };
    if (request.method === "POST") {
      const values = Array.isArray(input) ? input : [input];
      for (const row of values) {
        if (!owned(row)) return send(403, { message: "RLS denied" });
        const index = rows[table].findIndex((current) => current.id === row.id);
        if (index < 0) rows[table].push(row);
        else if (!String(request.headers.prefer).includes("ignore-duplicates"))
          rows[table][index] = { ...rows[table][index], ...row };
      }
      return send(201, values);
    }
    let result = rows[table].filter(filtered);
    if (request.method === "PATCH") {
      for (const row of result) Object.assign(row, input);
      return send(200, result);
    }
    if (request.method === "DELETE") {
      rows[table] = rows[table].filter((row) => !result.includes(row));
      return send(200, result);
    }
    const order = (url.searchParams.get("order") ?? "").split(",");
    result.sort((a, b) => {
      for (const part of order) {
        const [key, direction] = part.split(".");
        const diff = String(a[key]).localeCompare(String(b[key]));
        if (diff) return direction === "desc" ? -diff : diff;
      }
      return 0;
    });
    result = result.slice(0, Number(url.searchParams.get("limit") ?? 1000));
    if (String(request.headers.accept).includes("vnd.pgrst.object"))
      return result.length === 1 ? send(200, result[0]) : send(406, { code: "PGRST116", details: "0 rows" });
    return send(200, result);
  })
  .listen(54329, "127.0.0.1", () => console.log("Supabase test fixture ready"));
