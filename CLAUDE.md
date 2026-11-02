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

The owner tests against their own MQTT broker, configured through `MQTT_URL`, `MQTT_USERNAME` and `MQTT_PASSWORD` in `.env` (see `.env.example`). The Compose Mosquitto (`--profile broker`) is only a fallback; with it, publish test messages using `docker compose exec -T mosquitto mosquitto_pub -t <topic> -m '<payload>'`.

## Architecture

v2 is a rewrite (branch `nuxt-rewrite`) of an Express + MongoDB + InfluxDB API whose separate Vue 2 GUI lived in `maximemoreillon/mqtt_logger_gui`. A single Nuxt 4 app (Nitro 2 / h3 v1) now serves the GUI, the REST API (`server/api/`) and the MQTT ingestion. It only works with the **node-server preset**: ingestion is a long-running process, so serverless and edge hosting are not possible.

- **`server/lib/` and `server/db/` are framework-independent** and use explicit relative imports. Nitro does not auto-import them, so they can't use h3 helpers like `createError`; those belong in route handlers. Route handlers in `server/api/` stay thin: zod validation (`server/lib/validation.ts`), then a call into `server/lib/queries.ts`.
- **Config comes from plain `process.env`**, parsed with zod in `server/lib/config.ts`. Nuxt's `runtimeConfig`/`NUXT_*` is not used, so the same variable names work for the app, drizzle-kit and deployments.
- **Startup order** is set in `server/plugins/ingestion.ts`: drizzle migrations (`MIGRATIONS_DIR`, copied to `/app/migrations` in the Docker image), then `setupTimescale()`, then the writer, then MQTT. There are deliberately no retries: any startup failure, including an unreachable database, exits the process in production so Kubernetes or Compose restarts it (owner's decision). In dev the server stays up to show the error. State is in `server/lib/startup.ts` and reported by `GET /api`.
- **TimescaleDB is optional and configured at startup, not in migrations.** `TIMESCALE=auto|true|false`. In auto mode, the extension is created and `points` becomes a hypertable (`migrate_data`) when available. Compression and retention policies are removed and re-added from env vars on every start. Plain Postgres must keep working: don't use Timescale-only SQL in queries (use `date_bin`, not `time_bucket`).

### Data model (`server/db/schema.ts`)
- `sources`: an MQTT topic filter (`+` and `#` allowed), a `keys` whitelist of flattened field names (empty means all fields), a `tags` jsonb object, and `user_id` (currently unused).
- `points (time, source_id, field, value double)`: deliberately has **no primary key**, because hypertable unique constraints must include `time`. It is **numbers only**: strings are intentionally dropped, which was a design decision. There is no fields table; the distinct fields of a source are found with a recursive-CTE loose index scan.

### Ingestion flow
1. `server/lib/mqtt.ts` keeps an in-memory list of sources. `reloadSources()` must be called after any source change; `syncSubscriptions()` diffs the topics to subscribe to, since several sources can share a topic. A reload also runs every 30 s so other replicas pick up changes. `MQTT_SHARED_GROUP` enables `$share/` subscriptions so replicas don't write duplicate points.
2. Messages are matched to sources in memory with `topicMatches()`; the database is not queried per message. `extractValues()` in `server/lib/ingest.ts` (pure functions, unit-tested) flattens nested JSON to dotted names, stores bare payloads under `value`, maps booleans to 1/0, and skips null, empty and non-numeric values.
3. `server/lib/writer.ts` buffers points and flushes every 1 s or every 5000 points via `INSERT ... SELECT FROM unnest(...) WHERE EXISTS (source)`. Points of deleted sources are dropped silently instead of failing the batch on the foreign key.

### Gotchas
- **`getPoints` groups by position** (`GROUP BY 1, 2`) on purpose: the `date_bin` expression contains bind parameters, so repeating it isn't recognized as the same expression. With drizzle's node-postgres driver, map raw `sql` timestamps with `.mapWith(points.time)` and numbers with `.mapWith(Number)`.
- **The base zod source schema has no defaults.** `updateSourceSchema` is `.partial()` of it, and zod 4 would apply defaults on PATCH and reset fields. Defaults live only in `createSourceSchema`.
- **Source deletion deletes points explicitly** inside a transaction rather than relying on the foreign-key cascade, because cascading is slow on a large table.

## Auth

Auth is **not implemented**: all `/api` routes are open. When it's added, use **nuxt-auth-utils with an OIDC provider** (owner's decision):
- browser session through nuxt-auth-utils
- bearer JWTs accepted on `/api` for scripts
- `userId` set from `sub` and every source query filtered by it
- disabled when no OIDC settings are configured

## Deployment

The repo is on GitHub (`maximemoreillon/mqtt_logger`). The old GitLab project is scheduled for deletion; the `gitlab` remote points to it.

GitHub Actions (`.github/workflows/ci.yml`) runs tests and the typecheck on every push and PR, then builds the Docker image (port 3000). It pushes `moreillon/mqtt-logger` to Docker Hub **only from `master`** (tags `latest` and the short SHA) and from `v*` tags (semver tags). This needs the repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

Nothing deploys automatically. `kubernetes_manifest.yml` is applied by hand with `envsubst`, which needs `APPLICATION_NAME`, `CONTAINER_IMAGE_TAGGED` and `K8S_INGRESS_HOST`. Its `environment-variables` secret must provide `DATABASE_URL` and the MQTT variables. The GUI in `app/` is currently a placeholder page.
