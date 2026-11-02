import { z } from "zod";
import { isValidTopicFilter } from "./ingest";

export const idParamsSchema = z.object({ id: z.uuid() });

// No defaults here: they would be applied on PATCH too and reset fields.
const sourceFields = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable(),
  topic: z
    .string()
    .trim()
    .refine(isValidTopicFilter, "Invalid MQTT topic filter"),
  keys: z.array(z.string().min(1)),
  tags: z.record(z.string().min(1), z.string()),
});

export const createSourceSchema = sourceFields.extend({
  description: sourceFields.shape.description.optional(),
  keys: sourceFields.shape.keys.default([]),
  tags: sourceFields.shape.tags.default({}),
});

export const updateSourceSchema = sourceFields.partial();

export const listSourcesQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const DAY_MS = 24 * 60 * 60 * 1000;

// ?fields=a&fields=b and ?fields=a,b are both accepted
const listParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) =>
    (Array.isArray(v) ? v : v ? [v] : [])
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const pointsQuerySchema = z
  .object({
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
    fields: listParam,
    // Max number of time buckets per field (values are averaged per bucket)
    buckets: z.coerce.number().int().min(1).max(10_000).default(500),
  })
  .transform(({ start, end, ...rest }) => {
    const e = end ?? new Date();
    return { ...rest, end: e, start: start ?? new Date(e.getTime() - DAY_MS) };
  })
  .refine(({ start, end }) => start < end, "start must be before end");
