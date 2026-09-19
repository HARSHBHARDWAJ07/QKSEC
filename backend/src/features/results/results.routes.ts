import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody, parseQuery, assertUuid } from "../../common/http/validation.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { getAccessibleStudentIds, assertStudentAccess } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const resultSchema = z
  .object({
    studentId: z.string().uuid(),
    examId: z.string().uuid().optional(),
    assignmentId: z.string().uuid().optional(),
    score: z.number().min(0).max(999999.99),
    grade: z.string().trim().max(20).nullable().optional(),
    feedback: z.string().trim().max(5000).nullable().optional(),
    publishedAt: z.string().datetime().nullable().optional(),
  })
  .refine((v) => Boolean(v.examId) !== Boolean(v.assignmentId), {
    message: "Exactly one of examId or assignmentId is required",
    path: ["examId"],
  });

// Score, grade, feedback, and publishedAt are the only mutable fields.
// studentId / examId / assignmentId are identity — delete + recreate if those need changing.
const updateResultSchema = z.object({
  score: z.number().min(0).max(999999.99).optional(),
  grade: z.string().trim().max(20).nullable().optional(),
  feedback: z.string().trim().max(5000).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

const SELECT = "id, student_id, exam_id, assignment_id, score, grade, feedback, published_at, created_by, created_at, updated_at";

export async function resultsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const query = parseQuery(z.object({ studentId: z.string().uuid().optional() }), request.query);
    const range = getPaginationRange(page, pageSize);
    const accessibleStudentIds = await getAccessibleStudentIds(request);

    if (query.studentId) await assertStudentAccess(request, query.studentId);
    if (accessibleStudentIds !== null && accessibleStudentIds.length === 0) {
      return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
    }

    let listQuery = supabaseAdmin.from("results").select(SELECT).order("created_at", { ascending: false });
    let countQuery = supabaseAdmin.from("results").select("id", { count: "exact", head: true });

    if (query.studentId) {
      listQuery = listQuery.eq("student_id", query.studentId);
      countQuery = countQuery.eq("student_id", query.studentId);
    } else if (accessibleStudentIds !== null) {
      listQuery = listQuery.in("student_id", accessibleStudentIds);
      countQuery = countQuery.in("student_id", accessibleStudentIds);
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
    const { data, error } = await supabaseAdmin
      .from("results")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "RESULT_NOT_FOUND", "Result not found");

    await assertStudentAccess(request, data.student_id);
    return reply.send({ data });
  });

  app.post("/", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const body = parseBody(resultSchema, request.body);
    await assertStudentAccess(request, body.studentId);

    const { data, error } = await supabaseAdmin
      .from("results")
      .insert({
        student_id: body.studentId,
        exam_id: body.examId ?? null,
        assignment_id: body.assignmentId ?? null,
        score: body.score,
        grade: body.grade ?? null,
        feedback: body.feedback ?? null,
        published_at: body.publishedAt ?? null,
        created_by: request.user?.id,
      })
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "RESULT_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/:id", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const body = parseBody(updateResultSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("results")
      .select("id, student_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "RESULT_NOT_FOUND", "Result not found");

    await assertStudentAccess(request, existing.student_id);

    const updates: Record<string, unknown> = {};
    if (body.score !== undefined) updates.score = body.score;
    if (body.grade !== undefined) updates.grade = body.grade;
    if (body.feedback !== undefined) updates.feedback = body.feedback;
    if (body.publishedAt !== undefined) updates.published_at = body.publishedAt;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("results")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "RESULT_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  // Admin-only: deleting a grade record is a high-stakes irreversible action.
  app.delete("/:id", {
    preHandler: [requireRoles("admin")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("results")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "RESULT_NOT_FOUND", "Result not found");

    const { error } = await supabaseAdmin.from("results").delete().eq("id", id);
    if (error) throw new AppError(400, "RESULT_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });
}
