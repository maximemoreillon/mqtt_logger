import { z } from "zod";

// Plain environment variables (rather than Nuxt's NUXT_* runtimeConfig) so the
// same names work for the app, drizzle-kit and docker / kubernetes deployments.
const schema = z.object({
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@localhost:5432/mqtt_logger"),
  MIGRATIONS_DIR: z.string().default("server/db/migrations"),

  MQTT_URL: z.string().default("mqtt://localhost:1883"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  // When set, subscribe with $share/<group>/<topic> so that replicas split
  // messages between them instead of each writing every point.
  MQTT_SHARED_GROUP: z.string().optional(),

  // auto: use TimescaleDB if the extension is available, ignore it otherwise
  TIMESCALE: z.enum(["auto", "true", "false"]).default("auto"),
  // Postgres intervals, e.g. "7 days". Unset = no policy.
  TIMESCALE_COMPRESS_AFTER: z.string().optional(),
  TIMESCALE_RETENTION: z.string().optional(),
});

// Empty values (e.g. MQTT_USERNAME= from compose) count as unset
export const config = schema.parse(
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")),
);
