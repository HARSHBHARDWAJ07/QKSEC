import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import type { PaginationMeta, PaginationQuery } from "../types/api.types.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export function parsePagination(query: PaginationQuery | unknown) {
  const result = paginationSchema.safeParse(query);
  if (!result.success) {
    throw new AppError(400, "QUERY_VALIDATION_ERROR", "Invalid pagination parameters", result.error.flatten());
  }
  return result.data;
}

export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function createPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}