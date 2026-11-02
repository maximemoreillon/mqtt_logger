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
| `/api`                            | GET    | Status                                                                                      |
| `/api/sources`                    | GET    | List sources (`search`, `limit`, `offset`)                                                  |
| `/api/sources`                    | POST   | Create a source (`name`, `topic`, `description?`, `keys?`, `tags?`)                         |
| `/api/sources/:id`                | GET    | Get a source                                                                                |
| `/api/sources/:id`                | PATCH  | Update a source                                                                             |
| `/api/sources/:id`                | DELETE | Delete a source and its points                                                              |
| `/api/sources/:id/fields`         | GET    | List the fields logged for a source                                                         |
| `/api/sources/:id/points`         | GET    | Points averaged per time bucket (`start`, `end`, `fields`, `buckets`; default: last 24 h, 500 buckets) |

## Environment variables

| Variable                   | Default                                                  | Description                                                                         |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`             | `postgres://postgres:postgres@localhost:5432/mqtt_logger` | PostgreSQL connection string                                                        |
| `MQTT_URL`                 | `mqtt://localhost:1883`                                  | MQTT broker URL                                                                     |
| `MQTT_USERNAME`            |                                                          | MQTT username                                                                       |
| `MQTT_PASSWORD`            |                                                          | MQTT password                                                                       |
| `MQTT_SHARED_GROUP`        |                                                          | Use shared subscriptions (`$share/<group>/...`), required when running replicas     |
| `TIMESCALE`                | `auto`                                                   | `auto`: use TimescaleDB if available, `true`: require it, `false`: never use it     |
| `TIMESCALE_COMPRESS_AFTER` |                                                          | Compress chunks older than this interval, e.g. `7 days`                             |
| `TIMESCALE_RETENTION`      |                                                          | Drop data older than this interval, e.g. `1 year`                                   |
| `PORT`                     | `3000`                                                   | HTTP port                                                                           |

Migrations run automatically on startup.

## Development

```bash
npm install
cp .env.example .env   # set MQTT_URL (and credentials) to your broker
docker compose up -d   # TimescaleDB
npm run dev            # http://localhost:3000
npm test
```

No broker at hand? `docker compose --profile broker up -d` also starts Mosquitto on `localhost:1883`.

After changing `server/db/schema.ts`, run `npm run db:generate` to create a migration.

To run the whole stack in Docker: `docker compose --profile app up --build`. It uses the MQTT settings from `.env`; add `--profile broker` to use the bundled Mosquitto instead.
