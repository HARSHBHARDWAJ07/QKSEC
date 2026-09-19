import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { parseQuery, assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const CLASS_SELECT = `id, name, capacity, academic_year_id, grade_id, supervisor_id, created_at, updated_at,
  academic_years!academic_year_id (id, name, starts_on, ends_on, is_current),
  grades!grade_id (id, level),
  teachers!supervisor_id (id, employee_number, profile_id, profiles!profile_id (id, first_name, last_name))`;

const classesQuerySchema = z.object({
  gradeId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
});

export async function classesRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(classesQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);

    let listQuery = supabaseAdmin.from("classes").select(CLASS_SELECT).order("name", { ascending: true });
    let countQuery = supabaseAdmin.from("classes").select("id", { count: "exact", head: true });

    if (q.gradeId) {
      listQuery = listQuery.eq("grade_id", q.gradeId);
      countQuery = countQuery.eq("grade_id", q.gradeId);
    }
    if (q.academicYearId) {
      listQuery = listQuery.eq("academic_year_id", q.academicYearId);
      countQuery = countQuery.eq("academic_year_id", q.academicYearId);
    }

    const [listResult, countResult] = await Promise.all([listQuery.range(range.from, range.to), countQuery]);
    if (listResult.error) throw new AppError(500, "FETCH_FAILED", listResult.error.message);
    if (countResult.error) throw new AppError(500, "FETCH_FAILED", countResult.error.message);
    return { data: listResult.data ?? [], meta: createPaginationMeta(page, pageSize, countResult.count ?? 0) };
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);

    const { data, error } = await supabaseAdmin.from("classes").select(CLASS_SELECT).eq("id", id).maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");

    return reply.send({ data });
  });
}
