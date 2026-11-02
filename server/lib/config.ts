import { z } from "zod";

// DATABASE_URL is a plain environment variable because drizzle-kit
// (drizzle.config.ts) needs it outside Nuxt. Every other setting is Nuxt
// runtimeConfig (NUXT_* variables, see nuxt.config.ts), validated by
// parseSettings() at startup.
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/mqtt_logger";

// Nuxt parses NUXT_* values with destr: "true" becomes a boolean, "123456"
// a number. Turn them back into strings. (Values like "1e3" or JSON are
// still altered by destr; avoid them in passwords.)
const asString = (v: unknown) =>
  v == null ? undefined : typeof v === "object" ? JSON.stringify(v) : String(v);
const string = z.preprocess(asString, z.string().min(1));
// runtimeConfig defaults to "" for unset values: treat them as unset
const optional = z.preprocess(
  (v) => asString(v) || undefined,
  z.string().optional(),
);

const settingsSchema = z.object({
  migrationsDir: string,
  mqtt: z.object({
    url: string,
    username: optional,
    password: optional,
    // When set, subscribe with $share/<group>/<topic> so that replicas split
    // messages between them instead of each writing every point.
    sharedGroup: optional,
  }),
  timescale: z.object({
    // auto: use TimescaleDB if the extension is available, ignore it otherwise
    mode: z.preprocess(asString, z.enum(["auto", "true", "false"])),
    // Postgres intervals, e.g. "7 days". Unset = no policy.
    compressAfter: optional,
    retention: optional,
  }),
});

export type Settings = z.output<typeof settingsSchema>;
export type MqttSettings = Settings["mqtt"];
export type TimescaleSettings = Settings["timescale"];

// Takes useRuntimeConfig() (this module stays independent of Nuxt)
export const parseSettings = (runtimeConfig: unknown): Settings => {
  const result = settingsSchema.safeParse(runtimeConfig);
  if (!result.success)
    throw new Error(`Invalid settings: ${z.prettifyError(result.error)}`);
  return result.data;
};
