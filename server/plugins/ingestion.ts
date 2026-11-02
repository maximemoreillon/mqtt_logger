import { pool, runMigrations } from "../db";
import { parseSettings } from "../lib/config";
import { startMqtt, stopMqtt } from "../lib/mqtt";
import { startup } from "../lib/startup";
import { setupTimescale } from "../lib/timescale";
import { startWriter, stopWriter } from "../lib/writer";

// Long-running ingestion: requires the node-server preset (not serverless).
export default defineNitroPlugin((nitroApp) => {
  const start = async () => {
    // Invalid settings fail startup like any other error
    const settings = parseSettings(useRuntimeConfig());
    await runMigrations(settings.migrationsDir);
    await setupTimescale(settings.timescale);
    startWriter();
    await startMqtt(settings.mqtt);
    startup.ready = true;
  };

  start().catch((error) => {
    // Drizzle wraps driver errors: the useful message is in `cause`. A refused
    // connection is an AggregateError with an empty message but a `code`.
    const cause = ((error as Error).cause ?? error) as Error & { code?: string };
    const message = cause.message || cause.code || String(error);
    startup.error = message;
    console.error(`[Startup] Failed: ${message}`, error);
    // No retries: crash so that the orchestrator (k8s, compose) restarts us.
    // In dev, keep the server up to show the error.
    if (!import.meta.dev) process.exit(1);
  });

  nitroApp.hooks.hook("close", async () => {
    await stopMqtt();
    await stopWriter();
    await pool.end();
  });
});
