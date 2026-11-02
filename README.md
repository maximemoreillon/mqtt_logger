# MQTT Logger

Logs numeric data received over MQTT into PostgreSQL, with optional TimescaleDB support. Built with Nuxt: the same app serves the GUI, the REST API and the MQTT ingestion.

> v2 is a rewrite. v1 (Express + MongoDB + InfluxDB) is on the `master` branch history.

## How data is stored

Each source subscribes to an MQTT topic filter (wildcards `+` and `#` allowed). Every numeric value of an incoming message becomes a row `(time, source_id, field, value)`:

| Payload                              | Stored fields                    |
| ------------------------------------ | -------------------------------- |
| `{"temperature": 21.5, "door": true}` | `temperature = 21.5`, `door = 1` |
| `{"ENERGY": {"Power": 12}}`           | `ENERGY.Power = 12`              |
| `21.5`                                | `value = 21.5`                   |
| `"ON"`, `null`, `""`                  | skipped (numbers only)           |

A source's `keys` optionally restricts which (flattened) fields are stored.

## API

| Endpoint                          | Method | Description                                                                                 |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `/api`                            | GET    | Status (public)                                                                             |
| `/api/sources`                    | GET    | List sources (`search`, `limit`, `offset`)                                                  |
| `/api/sources`                    | POST   | Create a source (`name`, `topic`, `description?`, `keys?`, `tags?`)                         |
| `/api/sources/:id`                | GET    | Get a source                                                                                |
| `/api/sources/:id`                | PATCH  | Update a source                                                                             |
| `/api/sources/:id`                | DELETE | Delete a source and its points                                                              |
| `/api/sources/:id/fields`         | GET    | List the fields logged for a source                                                         |
| `/api/sources/:id/points`         | GET    | Points averaged per time bucket (`start`, `end`, `fields`, `buckets`; default: last 24 h, 500 buckets) |

## Authentication

OIDC through [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils), enabled by setting `NUXT_OAUTH_OIDC_CLIENT_ID` (with `NUXT_OAUTH_OIDC_OPENID_CONFIG`). Without it every route is open.

- **GUI:** unauthenticated visitors are sent to `/login`, which starts the OIDC login at `/auth/oidc`. Register `<app URL>/auth/oidc` as a redirect URI with the provider.
- **Scripts:** send `Authorization: Bearer <JWT>` with an access token from the same provider. Its signature (provider JWKS), expiry, issuer and, if `NUXT_OIDC_AUDIENCE` is set, audience are checked.
- Each source belongs to the user (`sub` claim) who created it; users only see their own sources. Sources created while auth was off (`user_id` NULL) are invisible once it is on: assign them with `UPDATE sources SET user_id = '<sub>' WHERE user_id IS NULL`.
- `GET /api` (status) stays public.

## Environment variables

`DATABASE_URL` is a plain variable (drizzle-kit uses it too); the others are Nuxt runtime config, hence the `NUXT_` prefix. Nuxt parses their values, so a password such as `1e3` or one that looks like JSON is altered; plain numbers and `true`/`false` are fine.

| Variable                   | Default                                                  | Description                                                                         |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`             | `postgres://postgres:postgres@localhost:5432/mqtt_logger` | PostgreSQL connection string                                                        |
| `NUXT_MQTT_URL`                 | `mqtt://localhost:1883`                             | MQTT broker URL                                                                     |
| `NUXT_MQTT_USERNAME`            |                                                     | MQTT username                                                                       |
| `NUXT_MQTT_PASSWORD`            |                                                     | MQTT password                                                                       |
| `NUXT_MQTT_SHARED_GROUP`        |                                                     | Use shared subscriptions (`$share/<group>/...`), required when running replicas     |
| `NUXT_TIMESCALE_MODE`           | `auto`                                              | `auto`: use TimescaleDB if available, `true`: require it, `false`: never use it     |
| `NUXT_TIMESCALE_COMPRESS_AFTER` |                                                     | Compress chunks older than this interval, e.g. `7 days`                             |
| `NUXT_TIMESCALE_RETENTION`      |                                                     | Drop data older than this interval, e.g. `1 year`                                   |
| `NUXT_SESSION_PASSWORD`         |                                                     | Session cookie encryption key, at least 32 characters. Always required             |
| `NUXT_OAUTH_OIDC_CLIENT_ID`     |                                                     | OIDC client ID. Enables auth                                                        |
| `NUXT_OAUTH_OIDC_CLIENT_SECRET` |                                                     | OIDC client secret (omit for a public client)                                       |
| `NUXT_OAUTH_OIDC_OPENID_CONFIG` |                                                     | Provider discovery URL (`.../.well-known/openid-configuration`)                     |
| `NUXT_OAUTH_OIDC_REDIRECT_URL`  | inferred from the request                           | Login callback URL (`<app URL>/auth/oidc`), e.g. behind a proxy                    |
| `NUXT_OIDC_AUDIENCE`            |                                                     | Required `aud` of bearer tokens; unset = not checked                                |
| `PORT`                     | `3000`                                                   | HTTP port                                                                           |

Migrations run automatically on startup.

## Development

```bash
npm install
cp .env.example .env   # set NUXT_MQTT_URL (and credentials) to your broker
docker compose up -d   # TimescaleDB
npm run dev            # http://localhost:3000
npm test
```

No broker at hand? `docker compose --profile broker up -d` also starts Mosquitto on `localhost:1883`.

After changing `server/db/schema.ts`, run `npm run db:generate` to create a migration.

To run the whole stack in Docker: `docker compose --profile app up --build`. It uses the MQTT settings from `.env`; add `--profile broker` to use the bundled Mosquitto instead.
