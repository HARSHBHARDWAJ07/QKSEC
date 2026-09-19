import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

export async function subjectsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const range = getPaginationRange(page, pageSize);

    const [listResult, countResult] = await Promise.all([
      supabaseAdmin.from("subjects").select("*").order("name", { ascending: true }).range(range.from, range.to),
      supabaseAdmin.from("subjects").select("id", { count: "exact", head: true }),
    ]);

    if (listResult.error) throw new AppError(500, "FETCH_FAILED", listResult.error.message);
    if (countResult.error) throw new AppError(500, "FETCH_FAILED", countResult.error.message);
    return { data: listResult.data ?? [], meta: createPaginationMeta(page, pageSize, countResult.count ?? 0) };
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);

    const { data, error } = await supabaseAdmin.from("subjects").select("*").eq("id", id).maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "SUBJECT_NOT_FOUND", "Subject not found");

    return reply.send({ data });
  });
}
