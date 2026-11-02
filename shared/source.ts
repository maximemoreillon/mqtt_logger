// Shared by the server (API validation) and the app (forms).
import { z } from "zod";

// Validates an MQTT topic filter: + and # wildcards must occupy a whole level,
// and # must be the last level.
export const isValidTopicFilter = (filter: string): boolean => {
  if (!filter || filter.length > 65535 || filter.includes("\u0000"))
    return false;
  const levels = filter.split("/");
  return levels.every((level, i) => {
    if (level === "#") return i === levels.length - 1;
    if (level === "+") return true;
    return !level.includes("#") && !level.includes("+");
  });
};

// No defaults here: they would be applied on PATCH too and reset fields.
export const sourceFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullable(),
  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .refine(isValidTopicFilter, "Invalid MQTT topic filter"),
  keys: z.array(z.string().min(1)),
  tags: z.record(z.string().min(1), z.string()),
});

export const createSourceSchema = sourceFieldsSchema.extend({
  description: sourceFieldsSchema.shape.description.optional(),
  keys: sourceFieldsSchema.shape.keys.default([]),
  tags: sourceFieldsSchema.shape.tags.default({}),
});

export const updateSourceSchema = sourceFieldsSchema.partial();

export type SourceInput = z.input<typeof createSourceSchema>;
