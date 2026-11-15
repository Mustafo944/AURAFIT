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
    "@/lib/nutrition": load("src/lib/nutrition.ts"),
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
  for (const name of ["workout-recovery", "scan-food", "lookup-barcode"]) {
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
    mealName: "Test meal",
    components: [{ name: "Rice", ref: "guruch", grams: 200 }],
    confidence: "high",
    note: "Test",
  }), calls);
  const input = { image: "AAAA", mimeType: "image/jpeg" };
  const responses = await Promise.all([scan.POST(request(input)), scan.POST(request(input))]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal((await scan.POST(request(input))).status, 200);
  assert.equal(calls.length, 1);
  // Yig'indi kodda hisoblanadi: 200 g guruch = 2 x 130 kcal.
  assert.equal(responses[0].body.totalCalories, 260);
  assert.equal(responses[0].body.components[0].per100g.kcal, 130);
  await scan.POST(request({ ...input, image: "AAAB" }));
  assert.equal(calls.length, 2);
});
test("food scan without recognizable food is reported instead of returning zeros", async () => {
  const empty = route("scan-food", "account-a", JSON.stringify({ mealName: "Aniqlanmadi", components: [], note: "x" }));
  const response = await empty.POST(request({ image: "AAAA", mimeType: "image/jpeg" }));
  assert.equal(response.status, 502);
  assert.match(response.body.error, /ovqat/);
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
  assert.deepEqual(requests[0].body.thinking, { type: "disabled" });
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


test("meal history groups meals by local day in time order", () => {
  const history = load("src/lib/meal-history.ts", {
    "@/lib/supabase/client": {},
    "@/lib/idb": {},
    "@/lib/meal-log": { mapMealRow: (row) => row },
    "@/lib/date-key": load("src/lib/date-key.ts"),
  });
  const at = (y, m, d, h) => new Date(y, m, d, h).toISOString();
  const meal = (id, timestamp) => ({ id, timestamp, calories: 100 });
  const days = history.groupMealsByDay([
    meal("late", at(2026, 9, 19, 20)),
    meal("early", at(2026, 9, 19, 8)),
    meal("next", at(2026, 9, 20, 0)),
  ]);
  assert.deepEqual([...days.keys()], ["2026-10-19", "2026-10-20"]);
  assert.deepEqual(Array.from(days.get("2026-10-19"), (m) => m.id), ["early", "late"]);
  assert.equal(history.dayKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("workout rows prefill from the previous session, validate input and pick rest by exercise", () => {
  const rows = load("src/lib/workout-rows.ts");
  assert.equal(rows.parseTargetSets("4"), 4);
  assert.equal(rows.parseTargetSets("abc"), 3);
  assert.equal(rows.parseTargetSets("99"), 10);
  const last = [
    { weightKg: 60, reps: 10 },
    { weightKg: 70, reps: 8 },
  ];
  // O'tgan mashg'ulotdagi shu raqamli podxod, keyin bugungi oxirgi, keyin o'tgan oxirgisi.
  assert.deepEqual({ ...rows.defaultDraft(1, [], last, false) }, { weight: "70", reps: "8" });
  assert.deepEqual({ ...rows.defaultDraft(2, [], last, false) }, { weight: "70", reps: "8" });
  assert.deepEqual({ ...rows.defaultDraft(2, [{ weightKg: 72.5, reps: 7 }], last, false) }, { weight: "72.5", reps: "7" });
  assert.deepEqual({ ...rows.defaultDraft(0, [], null, true) }, { weight: "0", reps: "" });
  assert.deepEqual({ ...rows.defaultDraft(0, [], null, false) }, { weight: "", reps: "" });
  assert.deepEqual({ ...rows.draftToSet({ weight: "60", reps: "10" }, false) }, { weightKg: 60, reps: 10 });
  assert.equal(rows.draftToSet({ weight: "", reps: "10" }, false), null);
  assert.equal(rows.draftToSet({ weight: "0", reps: "10" }, false), null);
  assert.deepEqual({ ...rows.draftToSet({ weight: "0", reps: "12" }, true) }, { weightKg: 0, reps: 12 });
  assert.equal(rows.draftToSet({ weight: "60", reps: "8.5" }, false), null);
  assert.equal(rows.adjustValue("60", 2.5), "62.5");
  assert.equal(rows.adjustValue("1", -2.5), "0");
  assert.equal(rows.restSecondsFor({ equipment: "barbell", muscleGroup: "legs" }), 150);
  assert.equal(rows.restSecondsFor({ equipment: "barbell", muscleGroup: "chest" }), 120);
  assert.equal(rows.restSecondsFor({ equipment: "dumbbell", muscleGroup: "biceps" }), 60);
  assert.equal(rows.restSecondsFor({ equipment: "machine", muscleGroup: "back" }), 90);
  assert.equal(rows.setVolume([{ weightKg: 60, reps: 10 }, { weightKg: 20, reps: 5 }]), 700);
});

test("auth callback only redirects to same-site paths", () => {
  const { safeNextPath } = load("src/lib/safe-redirect.ts", {}, { URL });
  assert.equal(safeNextPath(null), "/");
  assert.equal(safeNextPath(""), "/");
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/profile"), "/profile");
  assert.equal(safeNextPath("/analytics?tab=1#x"), "/analytics?tab=1#x");
  for (const bad of [
    ".evil.com",
    "@evil.com",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/ok\r\nSet-Cookie: x=1",
    "profile",
  ])
    assert.equal(safeNextPath(bad), "/", bad);
});

test("workout programs use catalog exercises; repeat and recent helpers behave", () => {
  const exercises = load("src/lib/exercises.ts");
  const programs = load("src/lib/workout-programs.ts", {
    "@/lib/exercises": exercises,
    "@/lib/date-key": load("src/lib/date-key.ts"),
  });
  const catalog = new Set(exercises.EXERCISES.map((exercise) => exercise.id));
  for (const program of programs.WORKOUT_PROGRAMS) {
    assert.ok(program.exerciseIds.length >= 4, program.id);
    assert.equal(new Set(program.exerciseIds).size, program.exerciseIds.length, `${program.id}: duplicates`);
    for (const id of program.exerciseIds) assert.ok(catalog.has(id), `${program.id}: ${id}`);
    assert.equal(programs.resolveExercises(program.exerciseIds).length, program.exerciseIds.length);
  }
  assert.deepEqual(
    Array.from(programs.resolveExercises(["Barbell_Squat", "removed-exercise", "Barbell_Squat"]), (e) => e.id),
    ["Barbell_Squat"],
  );
  const session = (finishedAt, list) => ({
    finishedAt,
    exercises: list.map(([exerciseId, muscleGroup, sets]) => ({
      exerciseId,
      muscleGroup,
      sets: Array.from({ length: sets }, () => ({})),
    })),
  });
  const old = session("2026-10-01T10:00:00Z", [["Barbell_Squat", "legs", 3]]);
  const chest = session("2026-10-05T10:00:00Z", [
    ["Barbell_Bench_Press_-_Medium_Grip", "chest", 4],
    ["Triceps_Pushdown", "triceps", 3],
    ["Crunches", "abs", 1],
  ]);
  const unknownOnly = session("2026-10-09T10:00:00Z", [["removed-exercise", "chest", 2]]);
  assert.equal(programs.lastRepeatableSession([old, chest, unknownOnly]), chest);
  assert.equal(programs.lastRepeatableSession([unknownOnly]), null);
  assert.equal(programs.sessionTitle(chest), "Ko'krak + Triseps");
  assert.equal(programs.sessionTitle(session("2026-10-09T10:00:00Z", [])), "Mashg'ulot");
  assert.deepEqual(Array.from(programs.recentExerciseIds([old, chest])), [
    "Barbell_Bench_Press_-_Medium_Grip",
    "Triceps_Pushdown",
    "Crunches",
    "Barbell_Squat",
  ]);
  const now = new Date(2026, 9, 10, 9);
  assert.equal(programs.daysAgoLabel(new Date(2026, 9, 10, 1).toISOString(), now), "bugun");
  assert.equal(programs.daysAgoLabel(new Date(2026, 9, 9, 23).toISOString(), now), "kecha");
  assert.equal(programs.daysAgoLabel(new Date(2026, 9, 5, 12).toISOString(), now), "5 kun oldin");
});

test("nutrition reference is internally consistent and components are computed in code", () => {
  const n = load("src/lib/nutrition.ts");
  const ids = new Set();
  for (const entry of n.FOOD_REFERENCE) {
    assert.ok(!ids.has(entry.id), `duplicate ${entry.id}`);
    ids.add(entry.id);
    const { kcal, proteinG, fatG, carbG } = entry.per100g;
    // Atwater: kaloriya ≈ 4·oqsil + 4·uglevod + 9·yog' (±15% yoki ±12 kcal).
    const implied = 4 * proteinG + 4 * carbG + 9 * fatG;
    assert.ok(Math.abs(kcal - implied) <= Math.max(12, implied * 0.15), `${entry.id}: ${kcal} vs ${implied}`);
    assert.ok(proteinG + fatG + carbG <= 100.5, `${entry.id}: macros exceed 100 g`);
  }
  assert.ok(n.FOOD_REFERENCE.length >= 60);
  assert.ok(n.referencePromptList().includes("plov — Osh (palov)"));

  // Ma'lumotnomadagi taomda AI qiymati e'tiborga olinmaydi.
  const plov = n.resolveComponent({ name: "Palov", ref: "plov", grams: 350, kcalPer100g: 999, proteinPer100g: 1, fatPer100g: 1, carbPer100g: 1 });
  assert.equal(plov.ref, "plov");
  assert.equal(plov.per100g.kcal, 195);
  assert.equal(plov.grams, 350);
  // Noma'lum ref -> AI bahosi, makrolardan tekshiriladi.
  const custom = n.resolveComponent({ name: "Mahalliy shirinlik", ref: "nope", grams: 80, kcalPer100g: 400, proteinPer100g: 5, fatPer100g: 15, carbPer100g: 60 });
  assert.equal(custom.ref, null);
  assert.equal(custom.per100g.kcal, 400);
  // Ichki zid qiymat (kaloriya makrolarga mos emas) makrolardan hisoblanadi.
  const fixed = n.resolveComponent({ name: "X", ref: null, grams: 100, kcalPer100g: 50, proteinPer100g: 10, fatPer100g: 20, carbPer100g: 10 });
  assert.equal(fixed.per100g.kcal, 260);
  for (const bad of [
    null,
    { name: "", ref: "plov", grams: 100 },
    { name: "Palov", ref: "plov", grams: 0 },
    { name: "Palov", ref: "plov", grams: 5000 },
    { name: "X", ref: null, grams: 100, kcalPer100g: 2000, proteinPer100g: 1, fatPer100g: 1, carbPer100g: 1 },
    { name: "X", ref: null, grams: 100 },
  ])
    assert.equal(n.resolveComponent(bad), null);

  const totals = n.sumComponents([
    { name: "Palov", ref: "plov", grams: 350, per100g: plov.per100g },
    { name: "Non", ref: "non", grams: 80, per100g: n.FOOD_REFERENCE.find((e) => e.id === "non").per100g },
  ]);
  assert.equal(totals.kcal, Math.round(3.5 * 195 + 0.8 * 265));
  assert.equal(totals.proteinG, Math.round(3.5 * 6 + 0.8 * 9));

  const response = n.parseScanResponse({
    mealName: "Osh va non",
    components: [
      { name: "Palov", ref: "plov", grams: 350 },
      { name: "Non", ref: "non", grams: 80 },
      { name: "Buzuq", ref: "plov", grams: -5 },
    ],
    note: "Porsiya katta",
    confidence: "bogus",
  });
  assert.equal(response.components.length, 2);
  assert.equal(response.totalCalories, totals.kcal);
  assert.deepEqual(Array.from(response.items), ["Palov", "Non"]);
  assert.equal(response.confidence, "medium");
  assert.equal(n.parseScanResponse({ mealName: "X", components: [] }), null);
  assert.equal(n.parseScanResponse({ mealName: "", components: [{ name: "a", ref: "plov", grams: 1 }] }), null);
  assert.equal(n.parseScanResponse(null), null);
});

test("auth input helpers normalize emails and accept only numeric verification codes", () => {
  const { normalizeEmail, isValidEmail, parseVerificationCode } = load("src/lib/auth-input.ts");
  assert.equal(normalizeEmail("  Test.User@Gmail.COM "), "test.user@gmail.com");
  assert.equal(normalizeEmail(null), "");
  assert.equal(isValidEmail("test.user@gmail.com"), true);
  for (const bad of ["", "plain", "a@b", "a b@c.com", "@gmail.com", `${"a".repeat(250)}@gmail.com`])
    assert.equal(isValidEmail(bad), false, bad);
  assert.equal(parseVerificationCode("123456"), "123456");
  assert.equal(parseVerificationCode(" 123 456 "), "123456");
  assert.equal(parseVerificationCode("123-456"), "123456");
  assert.equal(parseVerificationCode("12345678"), "12345678");
  for (const bad of ["", "12345", "12a456", "12345678901", null, 123456])
    assert.equal(parseVerificationCode(bad), null, String(bad));
});

test("resend cooldown is parsed from Supabase messages and bounded", () => {
  const { retryAfterSeconds, parseResendAt } = load("src/lib/auth-input.ts");
  assert.equal(retryAfterSeconds("For security purposes, you can only request this after 53 seconds."), 53);
  assert.equal(retryAfterSeconds("after 1 second"), 1);
  assert.equal(retryAfterSeconds("Email rate limit exceeded"), null);
  assert.equal(retryAfterSeconds(undefined), null);
  const now = 1_000_000;
  assert.equal(parseResendAt(String(now + 30_000), now), now + 30_000);
  assert.equal(parseResendAt(String(now - 1), now), null);
  assert.equal(parseResendAt(String(now + 11 * 60_000), now), null);
  assert.equal(parseResendAt("abc", now), null);
  assert.equal(parseResendAt(undefined, now), null);
});

