import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody, parseQuery, assertUuid } from "../../common/http/validation.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { getAccessibleLessonIds } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const assignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullable().optional(),
    startAt: z.string().datetime(),
    dueAt: z.string().datetime(),
    lessonId: z.string().uuid(),
    attachmentPath: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => v.dueAt >= v.startAt, { message: "dueAt must be after startAt", path: ["dueAt"] });

const updateAssignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    startAt: z.string().datetime().optional(),
    dueAt: z.string().datetime().optional(),
    attachmentPath: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (v) => !(v.startAt && v.dueAt) || v.dueAt >= v.startAt,
    { message: "dueAt must be after startAt", path: ["dueAt"] },
  );

const SELECT = "id, title, description, start_at, due_at, attachment_path, lesson_id, created_by, created_at, updated_at";

const assignmentsQuerySchema = z.object({
  lessonId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function assignmentsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(assignmentsQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);

    // Students and parents only see assignments in their accessible lessons
    const accessibleLessonIds = await getAccessibleLessonIds(request);
    if (accessibleLessonIds !== null && accessibleLessonIds.length === 0) {
      return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
    }

    let listQuery = supabaseAdmin.from("assignments").select(SELECT).order("due_at", { ascending: true });
    let countQuery = supabaseAdmin.from("assignments").select("id", { count: "exact", head: true });

    if (accessibleLessonIds !== null) {
      listQuery = listQuery.in("lesson_id", accessibleLessonIds);
      countQuery = countQuery.in("lesson_id", accessibleLessonIds);
    }
    if (q.lessonId) {
      listQuery = listQuery.eq("lesson_id", q.lessonId);
      countQuery = countQuery.eq("lesson_id", q.lessonId);
    }
    if (q.from) {
      listQuery = listQuery.gte("start_at", q.from);
      countQuery = countQuery.gte("start_at", q.from);
    }
    if (q.to) {
      listQuery = listQuery.lte("due_at", q.to);
      countQuery = countQuery.lte("due_at", q.to);
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
      .from("assignments")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");

    const accessibleLessonIds = await getAccessibleLessonIds(request);
    if (accessibleLessonIds !== null && !accessibleLessonIds.includes(data.lesson_id)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this assignment");
    }

    return reply.send({ data });
  });

  app.post("/", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const body = parseBody(assignmentSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert({
        title: body.title,
        description: body.description ?? null,
        start_at: body.startAt,
        due_at: body.dueAt,
        lesson_id: body.lessonId,
        attachment_path: body.attachmentPath ?? null,
        created_by: request.user?.id,
      })
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "ASSIGNMENT_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/:id", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const body = parseBody(updateAssignmentSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("assignments")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");

    if (request.profile?.role === "teacher" && existing.created_by !== request.user?.id) {
      throw new AppError(403, "FORBIDDEN", "You can only edit assignments you created");
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.startAt !== undefined) updates.start_at = body.startAt;
    if (body.dueAt !== undefined) updates.due_at = body.dueAt;
    if (body.attachmentPath !== undefined) updates.attachment_path = body.attachmentPath;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new AppError(400, "ASSIGNMENT_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/:id", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("assignments")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");

    if (request.profile?.role === "teacher" && existing.created_by !== request.user?.id) {
      throw new AppError(403, "FORBIDDEN", "You can only delete assignments you created");
    }

    const { error } = await supabaseAdmin.from("assignments").delete().eq("id", id);
    if (error) throw new AppError(400, "ASSIGNMENT_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });
}
