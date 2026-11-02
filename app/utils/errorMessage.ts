// Readable message from a $fetch error, including zod validation errors
export const errorMessage = (error: unknown): string => {
  const e = error as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
  };
  const message = e.data?.message;
  if (message) {
    try {
      const issues = JSON.parse(message) as { message: string; path?: string[] }[];
      if (Array.isArray(issues))
        return issues.map((i) => [i.path?.join("."), i.message].filter(Boolean).join(": ")).join(", ");
    } catch {
      // not a validation error
    }
    return message;
  }
  return e.data?.statusMessage ?? e.message ?? "Unknown error";
};
