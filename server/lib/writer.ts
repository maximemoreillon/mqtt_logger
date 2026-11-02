import { pool } from "../db";

interface PendingPoint {
  time: Date;
  sourceId: string;
  field: string;
  value: number;
}

const FLUSH_INTERVAL_MS = 1000;
const MAX_BATCH = 5000;
// Cap memory if the database is unreachable for a long time
const MAX_BUFFER = 100_000;

let buffer: PendingPoint[] = [];
let flushing: Promise<void> | null = null;
let timer: NodeJS.Timeout | null = null;

// unnest() sends the whole batch as 4 array parameters. The EXISTS check drops
// points of sources deleted in the meantime (e.g. by another replica whose
// cache is stale) instead of failing the whole batch on the foreign key.
const INSERT_SQL = `
  INSERT INTO points (time, source_id, field, value)
  SELECT t.time, t.source_id, t.field, t.value
  FROM unnest($1::timestamptz[], $2::uuid[], $3::text[], $4::float8[])
    AS t(time, source_id, field, value)
  WHERE EXISTS (SELECT 1 FROM sources s WHERE s.id = t.source_id)`;

const writeBatch = async (batch: PendingPoint[]) => {
  await pool.query(INSERT_SQL, [
    batch.map((p) => p.time),
    batch.map((p) => p.sourceId),
    batch.map((p) => p.field),
    batch.map((p) => p.value),
  ]);
};

export const flush = (): Promise<void> => {
  if (flushing) return flushing;
  if (!buffer.length) return Promise.resolve();

  flushing = (async () => {
    while (buffer.length) {
      // Take the batch out first: the buffer may be modified while writing
      const batch = buffer.splice(0, MAX_BATCH);
      try {
        await writeBatch(batch);
      } catch (error) {
        buffer = batch.concat(buffer);
        console.error(
          `[Writer] Failed to write ${batch.length} points, will retry`,
          error,
        );
        break;
      }
    }
  })().finally(() => {
    flushing = null;
  });

  return flushing;
};

export const enqueue = (points: PendingPoint[]) => {
  buffer.push(...points);
  if (buffer.length > MAX_BUFFER) {
    const dropped = buffer.length - MAX_BUFFER;
    buffer = buffer.slice(dropped);
    console.warn(`[Writer] Buffer full, dropped ${dropped} oldest points`);
  }
  if (buffer.length >= MAX_BATCH) void flush();
};

// Drop buffered points of a deleted source
export const discardSource = (sourceId: string) => {
  buffer = buffer.filter((p) => p.sourceId !== sourceId);
};

export const startWriter = () => {
  timer ??= setInterval(() => void flush(), FLUSH_INTERVAL_MS);
};

export const stopWriter = async () => {
  if (timer) clearInterval(timer);
  timer = null;
  await flush();
};
