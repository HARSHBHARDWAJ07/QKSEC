import { z } from "zod";
import { AppError } from "../errors/AppError.js";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", result.error.flatten());
  }
  return result.data;
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError(400, "QUERY_VALIDATION_ERROR", "Query parameter validation failed", result.error.flatten());
  }
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(id: string, code = "INVALID_ID"): void {
  if (!UUID_RE.test(id)) {
    throw new AppError(400, code, "Invalid ID format — expected a UUID");
  }
}