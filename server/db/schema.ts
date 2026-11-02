import { sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    name: text("name").notNull(),
    description: text("description"),
    // MQTT topic filter, wildcards (+, #) allowed
    topic: text("topic").notNull(),
    // Whitelist of (flattened) payload keys to log; empty = log every numeric key
    keys: text("keys").array().notNull().default(sql`'{}'::text[]`),
    tags: jsonb("tags").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sources_user_id_idx").on(t.userId),
    index("sources_topic_idx").on(t.topic),
  ],
);

// No primary key on purpose: TimescaleDB hypertables only allow unique
// constraints that include the time column, and time series don't need one.
export const points = pgTable(
  "points",
  {
    time: timestamp("time", { withTimezone: true }).notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (t) => [
    index("points_source_field_time_idx").on(
      t.sourceId,
      t.field,
      t.time.desc(),
    ),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Point = typeof points.$inferSelect;
