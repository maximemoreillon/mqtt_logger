import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import { points, sources, type NewSource } from "../db/schema";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export const listSources = async (opts: {
  search?: string;
  limit: number;
  offset: number;
}) => {
  const pattern = opts.search ? `%${escapeLike(opts.search)}%` : undefined;
  const where = pattern
    ? or(ilike(sources.name, pattern), ilike(sources.topic, pattern))
    : undefined;

  const [items, [totalRow]] = await Promise.all([
    db
      .select()
      .from(sources)
      .where(where)
      .orderBy(desc(sources.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(sources).where(where),
  ]);

  return {
    items,
    total: totalRow?.total ?? 0,
    limit: opts.limit,
    offset: opts.offset,
  };
};

export const getSource = async (id: string) => {
  const [source] = await db.select().from(sources).where(eq(sources.id, id));
  return source;
};

export const createSource = async (values: NewSource) => {
  const [source] = await db.insert(sources).values(values).returning();
  if (!source) throw new Error("Insert returned no row");
  return source;
};

export const updateSource = async (id: string, values: Partial<NewSource>) => {
  const [source] = await db
    .update(sources)
    .set(values)
    .where(eq(sources.id, id))
    .returning();
  return source;
};

export const deleteSource = (id: string) =>
  db.transaction(async (tx) => {
    // Explicit delete: cheaper than relying on the FK cascade on a big table
    await tx.delete(points).where(eq(points.sourceId, id));
    const [source] = await tx
      .delete(sources)
      .where(eq(sources.id, id))
      .returning();
    return source;
  });

// Distinct field names of a source. Recursive CTE = "loose index scan": one
// index lookup per field instead of scanning every point of the source.
export const getFields = async (sourceId: string) => {
  const { rows } = await db.execute<{ field: string }>(sql`
    WITH RECURSIVE f AS (
      (SELECT field FROM points WHERE source_id = ${sourceId}
       ORDER BY field LIMIT 1)
      UNION ALL
      SELECT (SELECT p.field FROM points p
              WHERE p.source_id = ${sourceId} AND p.field > f.field
              ORDER BY p.field LIMIT 1)
      FROM f WHERE f.field IS NOT NULL
    )
    SELECT field FROM f WHERE field IS NOT NULL`);
  return rows.map((r) => r.field);
};

// Points averaged into at most `buckets` time buckets per field.
export const getPoints = async (
  sourceId: string,
  opts: { start: Date; end: Date; fields: string[]; buckets: number },
) => {
  const { start, end, fields, buckets } = opts;
  const seconds = Math.max((end.getTime() - start.getTime()) / 1000 / buckets, 0.001);

  const rows = await db
    .select({
      time: sql`date_bin(make_interval(secs => ${seconds}), ${points.time}, ${start.toISOString()}::timestamptz)`.mapWith(points.time),
      field: points.field,
      value: sql`avg(${points.value})`.mapWith(Number),
    })
    .from(points)
    .where(
      and(
        eq(points.sourceId, sourceId),
        gte(points.time, start),
        lt(points.time, end),
        fields.length ? inArray(points.field, fields) : undefined,
      ),
    )
    // Positional: the bucket expression contains parameters, so repeating it
    // would not be recognized by Postgres as the same expression.
    .groupBy(sql`1`, sql`2`)
    .orderBy(sql`2`, sql`1`);

  const series = new Map<string, [Date, number][]>();
  for (const { time, field, value } of rows) {
    if (!series.has(field)) series.set(field, []);
    series.get(field)!.push([time, value]);
  }

  return {
    start,
    end,
    interval: seconds,
    series: [...series].map(([field, data]) => ({ field, data })),
  };
};
