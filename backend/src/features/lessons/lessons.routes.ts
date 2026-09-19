import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { parseQuery, assertUuid } from "../../common/http/validation.js";
import { getAccessibleClassIds } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const LESSON_SELECT = `id, name, weekday, start_time, end_time, subject_id, class_id, teacher_id,
  subjects!subject_id (id, name),
  classes!class_id (id, name),
  teachers!teacher_id (id, employee_number)`;

const lessonsQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  weekday: z.coerce.number().int().min(1).max(7).optional(),
});

export async function lessonsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(lessonsQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);

    // Students and parents only see lessons in their own class(es)
    const accessibleClassIds = await getAccessibleClassIds(request);
    if (accessibleClassIds !== null && accessibleClassIds.length === 0) {
      return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
    }

    let listQuery = supabaseAdmin
      .from("lessons")
      .select(LESSON_SELECT)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });
    let countQuery = supabaseAdmin.from("lessons").select("id", { count: "exact", head: true });

    if (accessibleClassIds !== null) {
      listQuery = listQuery.in("class_id", accessibleClassIds);
      countQuery = countQuery.in("class_id", accessibleClassIds);
    }
    if (q.classId) {
      listQuery = listQuery.eq("class_id", q.classId);
      countQuery = countQuery.eq("class_id", q.classId);
    }
    if (q.teacherId) {
      listQuery = listQuery.eq("teacher_id", q.teacherId);
      countQuery = countQuery.eq("teacher_id", q.teacherId);
    }
    if (q.subjectId) {
      listQuery = listQuery.eq("subject_id", q.subjectId);
      countQuery = countQuery.eq("subject_id", q.subjectId);
    }
    if (q.weekday !== undefined) {
      listQuery = listQuery.eq("weekday", q.weekday);
      countQuery = countQuery.eq("weekday", q.weekday);
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

    const { data, error } = await supabaseAdmin.from("lessons").select(LESSON_SELECT).eq("id", id).maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const accessibleClassIds = await getAccessibleClassIds(request);
    if (accessibleClassIds !== null && !accessibleClassIds.includes(data.class_id)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this lesson");
    }

    return reply.send({ data });
  });
}
