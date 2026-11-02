# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
docker compose up -d          # TimescaleDB (pg18) only; add --profile broker for a local Mosquitto
npm run dev                   # Nuxt dev server on :3000 (loads .env; runs migrations + MQTT ingestion on start)
npm test                      # vitest
npx vitest run server/lib/ingest.test.ts -t "topicMatches"   # single file / test
npm run typecheck             # nuxt typecheck (vue-tsc)
npm run db:generate           # drizzle-kit: create a migration after editing server/db/schema.ts
npm run build && node .output/server/index.mjs               # production build
docker compose --profile app up --build                      # whole stack in Docker
```

vitest and typecheck need `.nuxt/` (tsconfig references it). If it's missing, run `npx nuxt prepare`.

The owner tests against their own MQTT broker, configured through `NUXT_MQTT_URL`, `NUXT_MQTT_USERNAME` and `NUXT_MQTT_PASSWORD` in `.env` (see `.env.example`). The Compose Mosquitto (`--profile broker`) is only a fallback; with it, publish test messages using `docker compose exec -T mosquitto mosquitto_pub -t <topic> -m '<payload>'`.

## Architecture

v2 is a rewrite (branch `nuxt-rewrite`) of an Express + MongoDB + InfluxDB API whose separate Vue 2 GUI lived in `maximemoreillon/mqtt_logger_gui`. A single Nuxt 4 app (Nitro 2 / h3 v1) now serves the GUI, the REST API (`server/api/`) and the MQTT ingestion. It only works with the **node-server preset**: ingestion is a long-running process, so serverless and edge hosting are not possible.

- **`server/lib/` and `server/db/` are framework-independent** and use explicit relative imports. Nitro does not auto-import them, so they can't use h3 helpers like `createError`; those belong in route handlers. Nitro-dependent helpers go in `server/utils/` (auto-imported). Route handlers in `server/api/` stay thin: zod validation (`server/lib/validation.ts`), then a call into `server/lib/queries.ts`.
- **Config is Nuxt `runtimeConfig`** (declared in `nuxt.config.ts`, set at runtime by `NUXT_*` variables, e.g. `mqtt.url` ← `NUXT_MQTT_URL`). The one exception is `DATABASE_URL`, a plain env var because drizzle-kit (`drizzle.config.ts`) needs it outside Nuxt. Never read `process.env.X` in `nuxt.config.ts` to fill runtimeConfig: it would be baked in at build time. `server/plugins/ingestion.ts` validates the settings with `parseSettings()` (`server/lib/config.ts`, zod) and passes them into `runMigrations()`, `setupTimescale()` and `startMqtt()`, so `server/lib/` stays independent of Nuxt. Nitro parses `NUXT_*` values with destr (`"true"` → boolean, `"123"` → number), so the schema converts values back to strings and treats `""` as unset.
- **Startup order** is set in `server/plugins/ingestion.ts`: drizzle migrations (`NUXT_MIGRATIONS_DIR`, copied to `/app/migrations` in the Docker image), then `setupTimescale()`, then the writer, then MQTT. There are deliberately no retries: any startup failure, including an unreachable database, exits the process in production so Kubernetes or Compose restarts it (owner's decision). In dev the server stays up to show the error. State is in `server/lib/startup.ts` and reported by `GET /api`.
- **TimescaleDB is optional and configured at startup, not in migrations.** `NUXT_TIMESCALE_MODE=auto|true|false`. In auto mode, the extension is created and `points` becomes a hypertable (`migrate_data`) when available. Compression and retention policies are removed and re-added from settings on every start. Plain Postgres must keep working: don't use Timescale-only SQL in queries (use `date_bin`, not `time_bucket`).

### Data model (`server/db/schema.ts`)
- `sources`: an MQTT topic filter (`+` and `#` allowed), a `keys` whitelist of flattened field names (empty means all fields), a `tags` jsonb object, and `user_id` (OIDC `sub` of the owner, NULL when created with auth off).
- `points (time, source_id, field, value double)`: deliberately has **no primary key**, because hypertable unique constraints must include `time`. It is **numbers only**: strings are intentionally dropped, which was a design decision. There is no fields table; the distinct fields of a source are found with a recursive-CTE loose index scan.

### Ingestion flow
1. `server/lib/mqtt.ts` keeps an in-memory list of sources. `reloadSources()` must be called after any source change; `syncSubscriptions()` diffs the topics to subscribe to, since several sources can share a topic. A reload also runs every 30 s so other replicas pick up changes. `NUXT_MQTT_SHARED_GROUP` enables `$share/` subscriptions so replicas don't write duplicate points.
2. Messages are matched to sources in memory with `topicMatches()`; the database is not queried per message. `extractValues()` in `server/lib/ingest.ts` (pure functions, unit-tested) flattens nested JSON to dotted names, stores bare payloads under `value`, maps booleans to 1/0, and skips null, empty and non-numeric values.
3. `server/lib/writer.ts` buffers points and flushes every 1 s or every 5000 points via `INSERT ... SELECT FROM unnest(...) WHERE EXISTS (source)`. Points of deleted sources are dropped silently instead of failing the batch on the foreign key.

### Gotchas
- **`getPoints` groups by position** (`GROUP BY 1, 2`) on purpose: the `date_bin` expression contains bind parameters, so repeating it isn't recognized as the same expression. With drizzle's node-postgres driver, map raw `sql` timestamps with `.mapWith(points.time)` and numbers with `.mapWith(Number)`.
- **The base zod source schema has no defaults.** `updateSourceSchema` is `.partial()` of it, and zod 4 would apply defaults on PATCH and reset fields. Defaults live only in `createSourceSchema`.
- **Source deletion deletes points explicitly** inside a transaction rather than relying on the foreign-key cascade, because cascading is slow on a large table.

## Auth

OIDC through **nuxt-auth-utils**, used the library's standard way (owner's decision; `~/dev/openkintai` is the reference implementation). Enabled only when `NUXT_OAUTH_OIDC_CLIENT_ID` is set (`authEnabled()` in `server/utils/auth.ts`); otherwise every route is open and `event.context.user` is unset.
- **Browser:** `server/routes/auth/oidc.get.ts` is a plain `defineOAuthOidcEventHandler` (config from `runtimeConfig.oauth.oidc`) storing `user.id = sub` in the session. `app/middleware/auth.global.ts` redirects to `/login` (login button, `clear()` to log out). It learns whether auth is enabled from the server-only runtime config during SSR, through `useState`.
- **API:** `server/middleware/auth.ts` covers `/api/*` except `/api/_auth/*` (`GET /api` status is public). A `Authorization: Bearer` JWT (scripts) is verified with jose against the provider's JWKS (`verifyBearerToken` in `server/utils/auth.ts`, issuer + optional `NUXT_OIDC_AUDIENCE`); otherwise `requireUserSession`. The caller goes on `event.context.user`. The path is checked after `decodePath()`: the router decodes it, so checking the raw path let `/%61pi/sources` through.
- **Ownership:** every function in `server/lib/queries.ts` that touches sources takes `userId` (`undefined` = no filter) and route handlers pass `event.context.user?.id`. New routes must do the same. `deleteSource` checks ownership before deleting points.
- `NUXT_SESSION_PASSWORD` is required even with auth off: the GUI fetches the session on every SSR and nuxt-auth-utils fails to seal it without a password.
- MQTT ingestion ignores users: it matches all sources.

## Deployment

The repo is on GitHub (`maximemoreillon/mqtt_logger`). The old GitLab project is scheduled for deletion; the `gitlab` remote points to it.

GitHub Actions (`.github/workflows/ci.yml`) runs tests and the typecheck on every push and PR, then builds the Docker image (port 3000). It pushes `moreillon/mqtt-logger` to Docker Hub **only from `master`** (tags `latest` and the short SHA) and from `v*` tags (semver tags). This needs the repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

Nothing deploys automatically. `kubernetes_manifest.yml` is applied by hand with `envsubst`, which needs `APPLICATION_NAME`, `CONTAINER_IMAGE_TAGGED` and `K8S_INGRESS_HOST`. Its `environment-variables` secret must provide `DATABASE_URL` and the `NUXT_MQTT_*` variables, plus `NUXT_SESSION_PASSWORD` and, to enable auth, the `NUXT_OAUTH_OIDC_*` variables.

## GUI (`app/`)

The GUI uses Nuxt UI 4 and vue-echarts 8 (ECharts 6).
- **Theme:** the primary color is a custom **Crimson** palette (owner's choice). `#DC143C` is the 500 shade, defined with `@theme static` in `app/assets/css/main.css` and selected in `app/app.config.ts`. Icons are `i-lucide-*`, bundled locally through `@iconify-json/lucide` so nothing is fetched at runtime.
- **Shared validation:** `shared/source.ts` holds the zod source schemas and `isValidTopicFilter`. The API (`server/lib/validation.ts`, re-exported) and `SourceForm.vue` (via `#shared/source`) both use it, so change validation there.
- **Chart:** the points request on the source page is client-only and starts in `onMounted` (`server: false, immediate: false`). "Now" differs between server and browser, and a request pending during hydration causes mismatches. `VChart` fills its parent, so size the wrapper `div`, not the chart. Don't use `grid.containLabel`, which is deprecated in ECharts 6.
