import { z } from "zod";
export {
  createSourceSchema,
  updateSourceSchema,
} from "../../shared/source";

export const idParamsSchema = z.object({ id: z.uuid() });

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
