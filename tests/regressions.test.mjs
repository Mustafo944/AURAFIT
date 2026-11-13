import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {},
    console,
    Date,
    TextDecoder,
    Request,
    process: { env: { DEEPSEEK_API_KEY: "test" } },
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      if (name === "@/lib/exercise-metadata") return load("src/lib/exercise-metadata.ts");
      if (name === "@/lib/request-cache") return load("src/lib/request-cache.ts");
      if (name === "node:crypto") return { createHash };
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}
const validation = load("src/lib/api-validation.ts");
const profile = { age: 28, gender: "male", weightKg: 80, heightCm: 180, goal: "maintain" };
const nutrition = { calories: 2000, proteinG: 160, fatG: 60, carbG: 200 };
const recovery = {
  profile,
  session: {
    muscleGroups: ["legs"],
    exercises: [{ name: "Squat", sets: 3, topWeightKg: 50 }],
    totalSets: 3,
    totalVolumeKg: 1500,
    caloriesBurned: 100,
  },
  comparison: [],
  nutrition: { consumed: nutrition, target: nutrition },
};
function route(name, userId = "user", response = "null", calls = []) {
  return load(`src/app/api/${name}/route.ts`, {
    "@/lib/api-access": {
      checkApiAccess: async () => (userId ? null : { status: 401 }),
      authorizeApi: async () => ({ userId, response: userId ? null : { status: 401 } }),
    },
    "@/lib/provider-fetch": {},
    "@/lib/api-validation": validation,
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "@/lib/deepseek-server": {
      DEEPSEEK_MODEL: "deepseek-flash",
      FITNESS_SYSTEM_PROMPT: "system",
      callDeepSeek: async () => {
        calls.push(true);
        return { ok: true, text: response };
      },
      friendlyDeepSeekError: () => "error",
    },
  });
}
const request = (body) =>
  new Request("http://localhost/api/test", { method: "POST", body: JSON.stringify(body) });

test("all API endpoints reject anonymous callers before parsing or provider calls", async () => {
  for (const name of ["workout-recovery", "profile-insight", "scan-food", "lookup-barcode"]) {
    assert.equal((await route(name, null).POST({})).status, 401);
  }
});
test("malformed nested recovery data returns 400 without calling AI", async () => {
  const calls = [];
  const result = await route("workout-recovery", "user", "null", calls).POST(
    request({ profile: {}, session: {}, nutrition: {}, comparison: [] }),
  );
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
test("valid recovery succeeds; null AI output is a controlled 502", async () => {
  assert.equal((await route("workout-recovery").POST(request(recovery))).status, 502);
  const result = await route(
    "workout-recovery",
    "user",
    JSON.stringify({ recoveryAdvice: "Rest", progressAdvice: "Progress" }),
  ).POST(request(recovery));
  assert.equal(result.status, 200);
});
test("validators reject non-finite numbers and wrong array shapes", () => {
  assert.equal(validation.validRecovery(recovery), true);
  assert.equal(
    validation.validRecovery({ ...recovery, session: { ...recovery.session, exercises: {} } }),
    false,
  );
  assert.equal(validation.validRecovery({ ...recovery, profile: { ...profile, weightKg: Infinity } }), false);
  assert.equal(validation.validInsight({ profile, metrics: {} }), false);
});
test("food input and output are validated", async () => {
  assert.equal((await route("scan-food").POST(request({ image: {}, mimeType: "image/jpeg" }))).status, 400);
  assert.equal(
    (await route("scan-food").POST(request({ image: "AAAA", mimeType: "image/jpeg" }))).status,
    502,
  );
});
test("streamed JSON body limit applies without Content-Length", async () => {
  await assert.rejects(validation.readJson(request({ image: "x".repeat(100) }), 20), /BODY_TOO_LARGE/);
});

test("repeated valid food scans reuse one provider result within an account", async () => {
  const calls = [];
  const scan = route("scan-food", "account-a", JSON.stringify({
    mealName: "Test meal", items: ["Rice"], totalCalories: 200, proteinG: 5, fatG: 2, carbG: 40, note: "Test",
  }), calls);
  const input = { image: "AAAA", mimeType: "image/jpeg" };
  const responses = await Promise.all([scan.POST(request(input)), scan.POST(request(input))]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal((await scan.POST(request(input))).status, 200);
  assert.equal(calls.length, 1);
  await scan.POST(request({ ...input, image: "AAAB" }));
  assert.equal(calls.length, 2);
});
test("cardio-only sessions have no strength calories; mixed sessions subtract cardio time", () => {
  const { computeCaloriesBurned } = load("src/lib/workout-log.ts", {
    react: {},
    "@/lib/supabase/client": {},
    "@/lib/idb": {},
    "@/lib/user-resource": { createUserResource: () => ({}) },
  });
  assert.equal(computeCaloriesBurned("2026-09-26T10:00:00Z", "2026-09-26T10:30:00Z", 80, 0, 30), 0);
  assert.equal(computeCaloriesBurned("2026-09-26T10:00:00Z", "2026-09-26T11:00:00Z", 80, 6, 30), 200);
});
function syncHarness(tasks, responses = []) {
  const removed = [];
  const writes = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "a" } } } }),
      getUser: async () => ({ data: { user: { id: "a" } }, error: null }),
    },
    from: (table) => {
      const chain = {
        upsert: (row, options) => {
          writes.push({ table, row, options });
          return chain;
        },
        update: (row) => {
          writes.push({ table, row });
          return chain;
        },
        delete: () => chain,
        eq: () => chain,
        select: () => chain,
        maybeSingle: () => chain,
        then: (resolve) => Promise.resolve(responses.shift() ?? { error: null, data: [] }).then(resolve),
      };
      return chain;
    },
  };
  const mod = load("src/lib/sync-queue.ts", {
    "@/lib/supabase/client": { createClient: () => client },
    "@/lib/idb": {
      getSyncQueue: async () => tasks.filter((t) => !removed.includes(t.id)),
      removeSyncTask: async (id) => {
        removed.push(id);
      },
    },
  });
  return { ...mod, removed, writes, client };
}
const insert = { id: 1, type: "INSERT_SESSION", payload: { userId: "a", session: { id: "session-1" } } };
test("DB error retains queue and prevents dependent updates until retry succeeds", async () => {
  const update = { id: 2, type: "UPDATE_ADVICE", payload: { userId: "a", id: "session-1", advice: {} } };
  const h = syncHarness(
    [insert, update],
    [{ error: { message: "denied" } }, { error: null }, { error: null, data: [{ id: "session-1" }] }],
  );
  await assert.rejects(h.syncQueue("a"), /denied/);
  assert.deepEqual(h.removed, []);
  assert.equal(h.writes.length, 1);
  await h.syncQueue("a");
  assert.deepEqual(h.removed, [1, 2]);
  assert.equal(h.writes[1].options.ignoreDuplicates, true);
});
test("foreign and legacy unowned tasks are retained; concurrent runs share work", async () => {
  const h = syncHarness([
    insert,
    { ...insert, id: 2, payload: { ...insert.payload, userId: "b" } },
    { id: 3, type: "DELETE_MEAL", payload: { id: "old" } },
  ]);
  await Promise.all([h.syncQueue("a"), h.syncQueue("a")]);
  assert.deepEqual(h.removed, [1]);
  assert.equal(h.writes.length, 1);
});
test("RLS no-op deletes are retained when row still exists", async () => {
  const h = syncHarness(
    [{ id: 1, type: "DELETE_SESSION", payload: { userId: "a", sessionId: "x" } }],
    [
      { error: null, data: [] },
      { error: null, data: { id: "x" } },
    ],
  );
  await assert.rejects(h.syncQueue("a"), /serverdan/);
  assert.deepEqual(h.removed, []);
});
test("an expired or different session never drains the queue", async () => {
  const h = syncHarness([{ ...insert, payload: { ...insert.payload, userId: "b" } }]);
  await assert.rejects(h.syncQueue("b"), /tizimga/);
  assert.deepEqual(h.removed, []);
  assert.equal(h.writes.length, 0);
});
test("IndexedDB transaction abort is not reported as a successful durable save", async () => {
  const events = [];
  const db = {
    close() {},
    transaction() {
      const tx = {
        error: new Error("Quota exceeded"),
        objectStore: () => ({
          add() {
            queueMicrotask(() => tx.onabort());
          },
        }),
      };
      return tx;
    },
  };
  const idb = load(
    "src/lib/idb.ts",
    {},
    {
      window: { dispatchEvent: (event) => events.push(event) },
      Event,
      indexedDB: {
        open: () => {
          const req = { result: db };
          queueMicrotask(() => req.onsuccess());
          return req;
        },
      },
    },
  );
  await assert.rejects(idb.pushSyncTask(insert), /Quota exceeded/);
  assert.equal(events.length, 0);
});

test("account switch during an operation retains the task", async () => {
  const h = syncHarness([insert]);
  let reads = 0;
  h.client.auth.getSession = async () => ({ data: { session: { user: { id: ++reads === 1 ? "a" : "b" } } } });
  await assert.rejects(h.syncQueue("a"), /Hisob/);
  assert.deepEqual(h.removed, []);
});

test("shared API limits fail closed, return Retry-After and reject anonymous users", async () => {
  for (const [user, quota, expected] of [
    [null, { data: true }, 401],
    [{ id: "a" }, { data: false }, 429],
    [{ id: "a" }, { error: {} }, 503],
    [{ id: "a" }, { data: true }, null],
  ]) {
    let calls = 0;
    const guard = load("src/lib/api-access.ts", {
      "next/server": { NextResponse: { json: (body, init) => ({ body, ...init }) } },
      "@/lib/server-telemetry": { recordServerEvent() {} },
      "@/lib/supabase/server": {
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user }, error: null }) },
          rpc: async () => {
            calls++;
            return quota;
          },
        }),
      },
    });
    const result = await guard.checkApiAccess("scan-food");
    assert.equal(result?.status ?? null, expected);
    if (!user) assert.equal(calls, 0);
    if (expected === 429) assert.equal(result.headers["Retry-After"], "60");
  }
});
test("activity level changes TDEE without changing BMR", () => {
  const exercises = load("src/lib/exercises.ts");
  const preferences = load("src/lib/training-preferences.ts", { "@/lib/exercises": exercises });
  const fitness = load("src/lib/fitness.ts", { "@/lib/training-preferences": preferences });
  const low = fitness.calculateFitnessMetrics(28, "male", 80, 180, "maintain", "sedentary");
  const high = fitness.calculateFitnessMetrics(28, "male", 80, 180, "maintain", "active");
  assert.equal(low.bmr, high.bmr);
  assert.ok(high.tdee > low.tdee);
});
test("training plans honor equipment, level and days", () => {
  const exercises = load("src/lib/exercises.ts");
  const preferences = load("src/lib/training-preferences.ts", { "@/lib/exercises": exercises });
  const { buildTrainingPlan } = load("src/lib/training-plan.ts", {
    "@/lib/exercises": exercises,
    "@/lib/training-preferences": preferences,
  });
  const plan = buildTrainingPlan({
    experience: "beginner",
    equipment: ["bodyweight"],
    daysPerWeek: 4,
  });
  assert.equal(plan.length, 4);
  assert.ok(plan.some((day) => day.exercises.length > 0));
  for (const day of plan)
    for (const exercise of day.exercises) {
      assert.equal(exercise.equipment, "bodyweight");
      assert.equal(exercise.level, "beginner");
    }
});
test("weekly activity includes empty weeks and ignores out-of-range sessions", () => {
  const { weeklyWorkoutFrequency } = load("src/lib/forecast.ts");
  const now = new Date("2026-09-26T12:00:00Z");
  const points = weeklyWorkoutFrequency(
    [
      { finishedAt: "2026-09-25T12:00:00Z", totalVolumeKg: 100 },
      { finishedAt: "2026-09-11T12:00:00Z", totalVolumeKg: 200 },
      { finishedAt: "2026-10-25T12:00:00Z", totalVolumeKg: 300 },
    ],
    3,
    now,
  );
  assert.equal(points.length, 3);
  assert.equal(points[0].count, 1);
  assert.equal(points[1].count, 0);
  assert.equal(points[2].count, 1);
});
test("provider fetch attaches timeout and never exposes raw network errors", async () => {
  let options;
  const helper = load(
    "src/lib/provider-fetch.ts",
    { "@/lib/server-telemetry": { recordServerEvent() {} } },
    {
      AbortSignal,
      fetch: async (_url, init) => {
        options = init;
        throw new Error("secret-url");
      },
    },
  );
  await assert.rejects(helper.providerFetch("deepseek", "https://example.com", {}), /PROVIDER_UNAVAILABLE/);
  assert.ok(options.signal instanceof AbortSignal);
});

test("a slow server read cannot overwrite a newer local mutation", async () => {
  let resolveRead;
  const storage = new Map();
  const { createUserResource } = load("src/lib/user-resource.ts", {
    react: {},
    "@/context/auth-context": {},
    "@/lib/idb": {
      idbGet: async (key) => storage.get(key),
      idbSet: async (key, value) => storage.set(key, value),
    },
  });
  const resource = createUserResource(
    "test",
    [],
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  const reading = resource.refresh("a");
  await new Promise((resolve) => setImmediate(resolve));
  resource.update("a", () => ["local"]);
  resolveRead(["stale"]);
  await reading;
  assert.equal(resource.get("a").value[0], "local");
  assert.equal(resource.get("b").value.length, 0);
});
test("resource consumers share one request and receive the same immutable snapshot", async () => {
  let calls = 0;
  let resolveRead;
  const { createUserResource } = load("src/lib/user-resource.ts", {
    react: {},
    "@/context/auth-context": {},
    "@/lib/idb": { idbGet: async () => undefined, idbSet: async () => {} },
  });
  const resource = createUserResource("test", [], () => {
    calls++;
    return new Promise((resolve) => {
      resolveRead = resolve;
    });
  });
  const first = resource.refresh("a");
  await new Promise((resolve) => setImmediate(resolve));
  await resource.refresh("a");
  resolveRead(["fresh"]);
  await first;
  assert.equal(calls, 1);
  assert.equal(resource.get("a"), resource.get("a"));
  assert.equal(resource.get("a").value[0], "fresh");
});

test("expanded exercise catalog preserves unique IDs and complete guides across all groups", () => {
  const { EXERCISES, MUSCLE_GROUPS, EQUIPMENT_LABELS, LEVEL_LABELS, getAnimationFrames } =
    load("src/lib/exercises.ts");
  assert.ok(EXERCISES.length >= 137);
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length);
  for (const group of MUSCLE_GROUPS)
    assert.ok(EXERCISES.filter((exercise) => exercise.muscleGroup === group.id).length >= 19, group.id);
  for (const exercise of EXERCISES) {
    assert.ok(EQUIPMENT_LABELS[exercise.equipment]);
    assert.ok(LEVEL_LABELS[exercise.level]);
    assert.ok(exercise.instructions.length >= 3);
    assert.ok(exercise.instructions.every((step) => step.length > 15));
    assert.ok(exercise.name && exercise.englishName);
    assert.equal(new URL(exercise.image).hostname, "raw.githubusercontent.com");
    assert.equal(getAnimationFrames(exercise)[1], exercise.image.replace("/0.jpg", "/1.jpg"));
  }
});

test("AI cache coalesces requests, isolates keys, expires and does not retain failures", async () => {
  let now = 1000;
  const { createRequestCache } = load("src/lib/request-cache.ts", {}, { Date: { now: () => now } });
  const cache = createRequestCache(100, 2, 1);
  let calls = 0,
    finish;
  const run = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = cache("user-a:photo", run);
  const second = cache("user-a:photo", run);
  await Promise.resolve();
  await assert.rejects(cache("user-b:photo", run), /AI_BUSY/);
  finish("result");
  assert.deepEqual(await Promise.all([first, second]), ["result", "result"]);
  assert.equal(calls, 1);
  assert.equal(
    await cache("user-a:photo", () => {
      throw Error("cached");
    }),
    "result",
  );
  assert.equal(await cache("user-b:photo", async () => "other user"), "other user");
  now += 101;
  await assert.rejects(
    cache("user-a:photo", async () => {
      throw Error("failed");
    }),
    /failed/,
  );
  assert.equal(await cache("user-a:photo", async () => "fresh"), "fresh");
});

test("DeepSeek sends text and image requests, logs usage and hides credentials", async () => {
  const requests = [],
    events = [];
  const deepseek = load("src/lib/deepseek-server.ts", {
    "@/lib/server-telemetry": { recordServerEvent: (...args) => events.push(args) },
    "@/lib/provider-fetch": {
      providerFetch: async (_, url, init) => {
        requests.push({ url, headers: init.headers, body: JSON.parse(init.body) });
        return requests.length < 3
          ? new Response(
              JSON.stringify({ choices: [{ message: { content: "{}" } }], usage: { total_tokens: 42 } }),
            )
          : new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
      },
    },
  });
  const text = await deepseek.callDeepSeek("secret", { system: "sys", prompt: "hi" });
  assert.equal(text.ok, true);
  assert.equal(text.text, "{}");
  assert.equal(requests[0].url, "https://api.deepseek.com/chat/completions");
  assert.equal(requests[0].body.model, "deepseek-flash");
  assert.deepEqual(requests[0].body.response_format, { type: "json_object" });
  assert.equal(requests[0].body.messages[0].role, "system");
  await deepseek.callDeepSeek("secret", { prompt: "see", image: { mimeType: "image/png", data: "AAAA" } });
  const content = requests[1].body.messages[0].content;
  assert.equal(content[1].image_url.url, "data:image/png;base64,AAAA");
  const limited = await deepseek.callDeepSeek("secret", { prompt: "x" });
  assert.equal(limited.ok, false);
  assert.equal(limited.status, 429);
  assert.ok(events.some(([event, fields]) => event === "ai_attempt" && fields.tokens === 42));
  assert.ok(!JSON.stringify(events).includes("secret"));
});

test("progression requires all target sets, supports bodyweight and skips timed exercises", () => {
  const { suggestNextLoad } = load("src/lib/progression.ts");
  const exercise = { sets: "3", reps: "8-12", equipment: "barbell" };
  const set = (reps) => ({ weightKg: 40, reps });
  assert.equal(suggestNextLoad(exercise, [set(12)]).weightKg, 40);
  assert.equal(suggestNextLoad(exercise, [set(12), set(10), set(8)]).weightKg, 40);
  assert.equal(suggestNextLoad(exercise, [set(12), set(12), set(12)]).weightKg, 42.5);
  assert.equal(
    suggestNextLoad({ ...exercise, equipment: "bodyweight" }, [{ weightKg: 0, reps: 9 }]).reps,
    10,
  );
  assert.equal(suggestNextLoad({ ...exercise, reps: "30-45 son." }, [set(30)]), null);
});

test("weekly summary respects date boundaries, deduplicates sessions and counts zero-load sets", () => {
  const { summarizeProgress } = load("src/lib/progress-summary.ts");
  const now = new Date(2026, 9, 1, 12);
  const session = (id, day, weight = 20) => ({
    id,
    finishedAt: new Date(2026, 8, day, 10).toISOString(),
    exercises: [{ muscleGroup: "legs", sets: [{ weightKg: weight, reps: 10 }] }],
  });
  const recent = session("a", 30, 0);
  const result = summarizeProgress(
    [recent, recent, session("b", 25), session("c", 24), session("future", 40)],
    [],
    now,
  );
  assert.equal(result.count, 2);
  assert.equal(result.previousCount, 1);
  assert.equal(result.volume, 200);
  assert.equal(result.weightChange, null);
  assert.equal(result.groups.find((g) => g.id === "legs").sets, 2);
});

test("export paginates all server records, includes only own pending tasks and fails on account change", async () => {
  let active = "a",
    checks = 0;
  const source = Array.from({ length: 503 }, (_, i) => ({ id: String(i).padStart(4, "0"), user_id: "a" }));
  const client = {
    auth: {
      getUser: async () => {
        checks++;
        return { data: { user: { id: active } }, error: null };
      },
    },
    from(table) {
      let cursor = null;
      const query = {
        select: () => query,
        eq: (_, owner) => {
          assert.equal(owner, "a");
          return query;
        },
        order: () => query,
        limit: () => query,
        gt: (_, value) => {
          cursor = value;
          return query;
        },
        then(resolve) {
          return Promise.resolve({
            data: table === "meals" ? source.filter((r) => !cursor || r.id > cursor).slice(0, 500) : [],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
  };
  const mod = load(
    "src/lib/export-data.ts",
    {
      "@/lib/supabase/client": { createClient: () => client },
      "@/lib/idb": {
        idbGetStrict: async () => null,
        getSyncQueue: async () => [{ payload: { userId: "a" } }, { payload: { userId: "b" } }],
      },
    },
    { localStorage: { getItem: () => null } },
  );
  const exported = await mod.exportAccountData("a");
  assert.equal(exported.cloud.meals.length, 503);
  assert.equal(exported.pending.length, 1);
  assert.equal(checks, 2);
  client.auth.getUser = async () => ({ data: { user: { id: checks++ % 2 === 0 ? "a" : "b" } } });
  await assert.rejects(mod.exportAccountData("a"), /Hisob o'zgardi/);
});
