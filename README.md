# AuraFit

Uzbek-language fitness journal built with Next.js, React and Supabase.
It includes workout and meal logs, body-weight charts, personal training preferences,
local workout templates, saved meals, and optional AI analysis.

The exercise library includes 137 curated exercises across seven muscle groups,
with Uzbek cues, equipment/experience filters, selectable plans and two-position
image guides. Existing exercise IDs remain stable for historical records.
Exercise names and image paths are based on the public-domain
[Free Exercise DB](https://github.com/yuhonas/free-exercise-db); Uzbek instructions
are maintained in `src/lib/exercises.ts`. Images are loaded from that provider,
with a visible fallback when unavailable. The two images are reference positions,
not a complete motion video.

The library supports card and compact list views, alphabetical/difficulty sorting,
device-local favorites scoped to the signed-in account, and a reorderable workout
plan. Technique guides offer side-by-side reference images and keep their controls
accessible while scrolling. Reordering preserves previously logged sets.

## Local development

Use Node.js 24 or later (`.nvmrc` specifies 24).

```sh
npm ci
npm run dev
```

Create `.env.local` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
DEEPSEEK_API_KEY=your-server-only-key
```

AI keys are optional for the journal, charts and formula-based calculations.
Never put provider keys in `NEXT_PUBLIC_*` variables.

## Database setup and migration

For a new Supabase project, run `supabase/schema.sql` in the SQL Editor.
For an existing project, run these migrations **in order before deploying the app**:

1. `supabase/migrations/202609260001_workout_delete_policy.sql`
2. `supabase/migrations/202609260002_training_preferences.sql`
3. `supabase/migrations/202609260003_shared_api_limits.sql`
4. `supabase/migrations/202610010004_workout_cardio.sql`

They add owner-only workout deletion, profile preferences, and an atomic shared
API quota, and the cardio column for older installations. All are safe to run again. The local development checks do not apply
migrations to your live Supabase project.

If the quota function is unavailable, API handlers return 503 without calling
paid providers. Quotas are defined in the migration: 4 image scans, 15 profile
insights, 15 recovery requests and 20 barcode lookups per account per 60-second
window. The caller cannot set its own user ID or quota. Limits are shared across
all server instances. Updates to quota values require a database migration.

## Persistence and offline behavior

- An already-open journal can save offline. Opening or reloading an authenticated
  page requires a connection; offline navigation shows a neutral fallback page.
  The service worker caches only public static assets, never account HTML or RSC data.
- Journal mutations are committed to an IndexedDB outbox before a successful
  local save is reported. Server failures keep tasks queued, in operation order.
- The sync worker checks account identity before and after each operation, uses a
  browser lock to serialize tabs, and makes inserts idempotent by their UUID.
- Reconnection, new writes and a 15-second timer trigger retries. Each journal
  item displays its local/server status; failed sync has a manual retry action.
- Workout drafts remain on the device until the completed session is durably
  queued. A storage failure leaves the draft available for another attempt.
- Templates and saved meals are explicitly **device-local** and separated by
  account. They do not sync between devices.
- Legacy unowned queued deletes/advice are retained without replay; the app does
  not guess their owner. No task deletes another account's pending data.
- IndexedDB is required to save new journal entries. Private-mode storage
  restrictions or a full disk are reported, rather than silently losing writes.

## Architecture

- `src/lib/user-resource.ts`: shared per-account snapshots, cached reads,
  request deduplication and revision protection against stale responses.
- `src/lib/idb.ts`, `src/lib/sync-queue.ts`, `src/context/sync-context.tsx`:
  transactional outbox, authenticated replay and visible sync state.
- `src/lib/training-preferences.ts`, `fitness.ts`, `forecast.ts`:
  deterministic calculations independent of AI availability.
- `src/lib/api-access.ts`, `api-validation.ts`, `provider-fetch.ts`:
  authentication, shared quotas, bounded JSON and 12-second provider timeouts.
- `src/instrumentation.ts`: structured server error events. Logs exclude request
  bodies, auth headers, profile details and provider credentials. Your hosting
  log collector can ingest these events; no external monitoring account is configured.

Workout history uses keyset pagination (50 records per page). Weight charts show
the latest 30 points from the most recent 365 records. Chart axes label recorded
observations, rather than estimating values between missing measurements.
Training plans select exercises matching experience and available equipment;
they prepare an editable exercise list and never mark sets as already completed.

## Checks

```sh
npm run check
npm run build
npm audit
npx playwright install chromium
npm run test:e2e
```

Unit and regression tests isolate AI/Supabase calls. Browser tests run the real
app in Chromium at desktop and mobile sizes against a local Supabase-protocol
fixture, with AI keys disabled. They do not contact your live database. The
fixture only binds to `127.0.0.1` and is never imported by application code.
Run migrations and perform a real-account smoke test in a staging Supabase
project before production deployment, including RLS and expired-session cases.

CI uses Node 24 and runs lint, TypeScript, regression tests, dependency audit,
production build and browser tests. Failed browser traces/screenshots are retained
as CI artifacts for seven days.

## AI efficiency, progress and exports

- Food scans share concurrent requests for the same authenticated user and image.
  Valid results are retained for 15 minutes (up to 128 results and 16 in-flight
  scans per Node process). Keys are hashes including account, model configuration,
  prompt and image; raw images are not retained after completion. Failures are not
  cached. This is a process-local optimization, not a distributed cache: restarts
  and multiple server instances have independent caches and cooldowns.
- All AI features use DeepSeek V4.1 Flash (`deepseek-flash`, override with
  `DEEPSEEK_MODEL`); food photos accept JPEG, PNG and WebP. API limits still apply
  to every incoming scan, including cache hits. The 4/minute limit is per user and per endpoint, not a
  project-wide DeepSeek quota or billing cap.
- Structured `ai_attempt` events include model, status, duration and token total
  when provided. Count these events in hosting logs to track calls per model.
  No image, prompt or credential is logged.
- Exercise metadata is separate from the full catalog, keeping catalog data off
  the home/profile/analytics bundles. Export code loads on demand. Offline-critical
  workout views stay bundled so losing the connection never prevents completion;
  visual styles remain intact.
  Expired rest timers stop scheduling updates and hidden tabs pause timer work.
- Analytics summarizes the last 7 calendar days (including today), the preceding
  7 days, volume, recorded weight change and sets per primary muscle group. It
  explicitly labels partially loaded history. Zero-load bodyweight sets count.
- Load suggestions use all sets at the previous highest weight, requiring the
  target number of sets to reach the upper rep range before suggesting an increase.
  Suggestions remain editable; timed exercises do not receive rep suggestions.
- Profile export downloads all server pages plus account-scoped local snapshots,
  favorites, templates, active draft and pending operations as versioned JSON.
  Cloud and local data are separate, not a transactional backup or an import file.
  Export fails if a server page/local storage read fails or the account changes.

Run `node scripts/check-backend.mjs` for credential-safe read-only live schema
probes. It does not apply migrations or establish that every RLS policy is correct.
Use all four versioned migrations and the database regression tests to
validate owner access and shared limits before deployment.

Live schema probes on 2026-10-01 confirmed that the configured existing project
is missing `profiles.activity_level`, `profiles.training_preferences`, and
`workout_sessions.cardio`; the quota RPC endpoint returned 404. Apply the
reviewable `supabase/upgrade-existing.sql` in the project's SQL editor, then rerun
the probe. The file combines the four idempotent migrations and does not delete
application rows. Applying it requires database-owner access, which the public
application key cannot provide.

Production bundle comparison (2026-10-01, local fixture, mobile Chromium,
fresh browser context, service worker blocked; JS resources observed at page load):

| Route | Before JS bytes | After JS bytes | Before gzip bytes | After gzip bytes |
| --- | ---: | ---: | ---: | ---: |
| `/` | 851754 | 781807 | 240420 | 227412 |
| `/analytics` | 882137 | 817478 | 249512 | 238093 |
| `/workouts` | 938981 | 940226 | 266537 | 266760 |

Gzip sizes are computed from the emitted files, not a claim about a hosting
provider's compression settings. The workout route retains its offline editor
and gains the revised suggestions; home and analytics no longer load catalog
data. These are bundle measurements, not field loading-time or INP claims.
