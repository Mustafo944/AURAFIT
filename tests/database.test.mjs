import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
test("migrations are repeatable; database enforces owner deletion and shared quotas", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth, public to authenticated, anon;
      create table public.profiles(id uuid primary key references auth.users(id));
      create table public.workout_sessions(id uuid primary key, user_id uuid not null references auth.users(id));
      alter table public.workout_sessions enable row level security;
      create policy own_read on public.workout_sessions for select using(auth.uid() = user_id);
      grant select, delete on public.workout_sessions to authenticated;
      insert into auth.users values ('${A}'), ('${B}');
      insert into public.profiles values ('${A}'), ('${B}');
      insert into public.workout_sessions values ('${A}', '${A}'), ('${B}', '${B}');
    `);
    for (let repeat = 0; repeat < 2; repeat++) {
      for (const file of [
        "202609260001_workout_delete_policy.sql",
        "202609260002_training_preferences.sql",
        "202609260003_shared_api_limits.sql",
        "202610010004_workout_cardio.sql",
        "202611130005_daily_api_limits.sql",
      ]) {
        await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
      }
    }
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
    const cardio = await db.query("select cardio from public.workout_sessions limit 1");
    assert.deepEqual(cardio.rows[0].cardio, []);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("delete from public.workout_sessions where id = $1 returning id", [B])).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.workout_sessions where id = $1 returning id", [A])).rows.length,
      1,
    );
    const consume = async (scope) =>
      (await db.query("select public.consume_api_limit($1) as allowed", [scope])).rows[0].allowed;
    assert.equal(await consume("unknown"), false);
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => consume("scan-food")));
    assert.equal(concurrent.filter(Boolean).length, 4);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [B]);
    assert.equal(await consume("scan-food"), true);
    await assert.rejects(
      db.query("update public.api_rate_limits set request_count = 1"),
      /permission denied/,
    );
    await db.exec(
      "reset role; update public.api_rate_limits set window_started_at = now() - interval '61 seconds'; set role authenticated",
    );
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
    assert.equal(await consume("scan-food"), true);
    await db.exec(
      "reset role; update public.api_rate_limits set window_started_at = now() - interval '61 seconds', day_count = 30; set role authenticated",
    );
    assert.equal(await consume("scan-food"), false, "daily cap blocks even when the minute window is free");
    await db.exec("reset role; update public.api_rate_limits set day = current_date - 1; set role authenticated");
    assert.equal(await consume("scan-food"), true, "cap resets on a new day");
    await db.exec("reset role; set role anon");
    await assert.rejects(consume("scan-food"), /permission denied/);
  } finally {
    await db.close();
  }
});
