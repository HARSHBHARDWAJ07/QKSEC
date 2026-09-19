import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody, parseQuery, assertUuid } from "../../common/http/validation.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { getAccessibleLessonIds } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const examSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    maxScore: z.number().positive().max(9999.99).default(100),
    lessonId: z.string().uuid(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] });

const updateExamSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    maxScore: z.number().positive().max(9999.99).optional(),
  })
  .refine(
    (v) => !(v.startsAt && v.endsAt) || v.endsAt > v.startsAt,
    { message: "endsAt must be after startsAt", path: ["endsAt"] },
  );

const SELECT = "id, title, starts_at, ends_at, max_score, lesson_id, created_by, created_at, updated_at";

const examsQuerySchema = z.object({
  lessonId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function examsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(examsQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);

    // Students and parents only see exams in their accessible lessons
    const accessibleLessonIds = await getAccessibleLessonIds(request);
    if (accessibleLessonIds !== null && accessibleLessonIds.length === 0) {
      return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
    }

    let listQuery = supabaseAdmin.from("exams").select(SELECT).order("starts_at", { ascending: true });
    let countQuery = supabaseAdmin.from("exams").select("id", { count: "exact", head: true });

    if (accessibleLessonIds !== null) {
      listQuery = listQuery.in("lesson_id", accessibleLessonIds);
      countQuery = countQuery.in("lesson_id", accessibleLessonIds);
    }
    if (q.lessonId) {
      listQuery = listQuery.eq("lesson_id", q.lessonId);
      countQuery = countQuery.eq("lesson_id", q.lessonId);
    }
    if (q.from) {
      listQuery = listQuery.gte("starts_at", q.from);
      countQuery = countQuery.gte("starts_at", q.from);
    }
    if (q.to) {
      listQuery = listQuery.lte("starts_at", q.to);
      countQuery = countQuery.lte("starts_at", q.to);
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
      .from("exams")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "EXAM_NOT_FOUND", "Exam not found");

    const accessibleLessonIds = await getAccessibleLessonIds(request);
    if (accessibleLessonIds !== null && !accessibleLessonIds.includes(data.lesson_id)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this exam");
    }

    return reply.send({ data });
  });

  app.post("/", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const body = parseBody(examSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("exams")
      .insert({
        title: body.title,
        starts_at: body.startsAt,
        ends_at: body.endsAt,
        max_score: body.maxScore,
        lesson_id: body.lessonId,
        created_by: request.user?.id,
      })
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "EXAM_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/:id", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const body = parseBody(updateExamSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("exams")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "EXAM_NOT_FOUND", "Exam not found");

    if (request.profile?.role === "teacher" && existing.created_by !== request.user?.id) {
      throw new AppError(403, "FORBIDDEN", "You can only edit exams you created");
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.startsAt !== undefined) updates.starts_at = body.startsAt;
    if (body.endsAt !== undefined) updates.ends_at = body.endsAt;
    if (body.maxScore !== undefined) updates.max_score = body.maxScore;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("exams")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "EXAM_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/:id", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("exams")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "EXAM_NOT_FOUND", "Exam not found");

    if (request.profile?.role === "teacher" && existing.created_by !== request.user?.id) {
      throw new AppError(403, "FORBIDDEN", "You can only delete exams you created");
    }

    const { error } = await supabaseAdmin.from("exams").delete().eq("id", id);
    if (error) throw new AppError(400, "EXAM_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });
}
