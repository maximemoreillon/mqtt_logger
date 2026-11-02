import { pool } from "../db";
import { config } from "./config";

// Runs at startup rather than as a migration so that TimescaleDB can be enabled
// (or policies changed) on an existing database just by changing env vars.
export const setupTimescale = async () => {
  const mode = config.TIMESCALE;
  if (mode === "false") {
    console.log("[Timescale] Disabled");
    return;
  }

  try {
    const { rowCount } = await pool.query(
      "SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'",
    );
    if (!rowCount) throw new Error("timescaledb extension is not available");

    await pool.query("CREATE EXTENSION IF NOT EXISTS timescaledb");
    // migrate_data converts rows written while running on plain Postgres
    await pool.query(
      `SELECT create_hypertable('points', by_range('time'),
         if_not_exists => TRUE, migrate_data => TRUE)`,
    );

    // Env vars are the source of truth: drop existing policies, then re-add.
    await pool.query(
      "SELECT remove_compression_policy('points', if_exists => TRUE)",
    );
    if (config.TIMESCALE_COMPRESS_AFTER) {
      await pool.query(
        `ALTER TABLE points SET (
           timescaledb.compress,
           timescaledb.compress_segmentby = 'source_id, field',
           timescaledb.compress_orderby = 'time DESC')`,
      );
      await pool.query(
        "SELECT add_compression_policy('points', $1::interval)",
        [config.TIMESCALE_COMPRESS_AFTER],
      );
    }

    await pool.query(
      "SELECT remove_retention_policy('points', if_exists => TRUE)",
    );
    if (config.TIMESCALE_RETENTION) {
      await pool.query("SELECT add_retention_policy('points', $1::interval)", [
        config.TIMESCALE_RETENTION,
      ]);
    }

    console.log(
      `[Timescale] Enabled (compress after: ${config.TIMESCALE_COMPRESS_AFTER ?? "never"}, retention: ${config.TIMESCALE_RETENTION ?? "forever"})`,
    );
  } catch (error) {
    if (mode === "true") throw error;
    console.log(
      `[Timescale] Not used, running on plain PostgreSQL (${(error as Error).message})`,
    );
  }
};
