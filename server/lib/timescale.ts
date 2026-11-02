import { pool } from "../db";
import type { TimescaleSettings } from "./config";

// Runs at startup rather than as a migration so that TimescaleDB can be enabled
// (or policies changed) on an existing database just by changing settings.
export const setupTimescale = async (settings: TimescaleSettings) => {
  const { mode, compressAfter, retention } = settings;
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

    // Settings are the source of truth: drop existing policies, then re-add.
    await pool.query(
      "SELECT remove_compression_policy('points', if_exists => TRUE)",
    );
    if (compressAfter) {
      await pool.query(
        `ALTER TABLE points SET (
           timescaledb.compress,
           timescaledb.compress_segmentby = 'source_id, field',
           timescaledb.compress_orderby = 'time DESC')`,
      );
      await pool.query(
        "SELECT add_compression_policy('points', $1::interval)",
        [compressAfter],
      );
    }

    await pool.query(
      "SELECT remove_retention_policy('points', if_exists => TRUE)",
    );
    if (retention) {
      await pool.query("SELECT add_retention_policy('points', $1::interval)", [
        retention,
      ]);
    }

    console.log(
      `[Timescale] Enabled (compress after: ${compressAfter ?? "never"}, retention: ${retention ?? "forever"})`,
    );
  } catch (error) {
    if (mode === "true") throw error;
    console.log(
      `[Timescale] Not used, running on plain PostgreSQL (${(error as Error).message})`,
    );
  }
};
