// Pure functions, no I/O: payload parsing and MQTT topic matching.

export interface FieldValue {
  field: string;
  value: number;
}

// Field name used when the payload is a bare value, e.g. "21.5"
export const SCALAR_FIELD = "value";

const MAX_DEPTH = 8;

// Converts a single JSON value to a number, or null if it should be skipped.
// Note: Number("") and Number(null) are 0, hence the explicit checks.
export const toNumber = (input: unknown): number | null => {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input === "boolean") return input ? 1 : 0;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// Flattens nested objects / arrays into dotted field names:
// { ENERGY: { Power: 12 } } -> [{ field: "ENERGY.Power", value: 12 }]
const flatten = (
  input: unknown,
  prefix: string,
  depth: number,
  out: FieldValue[],
) => {
  if (input !== null && typeof input === "object") {
    if (depth >= MAX_DEPTH) return;
    for (const [key, child] of Object.entries(input)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, depth + 1, out);
    }
    return;
  }
  const value = toNumber(input);
  if (value !== null) out.push({ field: prefix || SCALAR_FIELD, value });
};

// Extracts numeric values from a raw MQTT payload.
// keys: optional whitelist of (flattened) field names.
export const extractValues = (
  payload: string,
  keys: string[] = [],
): FieldValue[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    // Not JSON: may still be a bare value such as "21.5" or "ON"
    parsed = payload;
  }

  const values: FieldValue[] = [];
  flatten(parsed, "", 0, values);

  if (!keys.length) return values;
  const allowed = new Set(keys);
  return values.filter(({ field }) => allowed.has(field));
};

// MQTT topic filter matching, with + (single level) and # (multi level).
export const topicMatches = (filter: string, topic: string): boolean => {
  // Per spec, wildcards at the first level don't match $SYS-style topics
  if (topic.startsWith("$") && /^[+#]/.test(filter)) return false;

  const f = filter.split("/");
  const t = topic.split("/");

  for (let i = 0; i < f.length; i++) {
    if (f[i] === "#") return true;
    if (i >= t.length) return false;
    if (f[i] !== "+" && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
};

export { isValidTopicFilter } from "../../shared/source";
