import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { parseQuery, assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

// Admin/teacher: full profile including contact details
const TEACHER_SELECT_FULL = `id, employee_number, active, profile_id,
  profiles!profile_id (id, first_name, last_name, role, phone, address, avatar_path)`;

// Student/parent: name and avatar only
const TEACHER_SELECT_LIMITED = `id, employee_number, active, profile_id,
  profiles!profile_id (id, first_name, last_name, avatar_path)`;

const teachersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  subjectId: z.string().uuid().optional(),
});

export async function teachersRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(teachersQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);
    const role = request.profile?.role;
    const select = (role === "admin" || role === "teacher") ? TEACHER_SELECT_FULL : TEACHER_SELECT_LIMITED;

    // subjectId filter: pre-query teacher_subjects to get matching teacher IDs
    let subjectTeacherIds: string[] | null = null;
    if (q.subjectId) {
      const { data: links, error: linksError } = await supabaseAdmin
        .from("teacher_subjects")
        .select("teacher_id")
        .eq("subject_id", q.subjectId);
      if (linksError) throw new AppError(500, "FETCH_FAILED", linksError.message);
      subjectTeacherIds = (links ?? []).map((l) => l.teacher_id);
      if (subjectTeacherIds.length === 0) {
        return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
      }
    }

    // search: pre-query profiles for name matches
    let profileIds: string[] | null = null;
    if (q.search) {
      const term = `%${q.search}%`;
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .or(`first_name.ilike.${term},last_name.ilike.${term}`);
      if (profileError) throw new AppError(500, "FETCH_FAILED", profileError.message);
      profileIds = (profiles ?? []).map((p) => p.id);
    }

    let listQuery = supabaseAdmin.from("teachers").select(select).order("employee_number", { ascending: true });
    let countQuery = supabaseAdmin.from("teachers").select("id", { count: "exact", head: true });

    if (subjectTeacherIds !== null) {
      listQuery = listQuery.in("id", subjectTeacherIds);
      countQuery = countQuery.in("id", subjectTeacherIds);
    }
    if (q.search) {
      const term = `%${q.search}%`;
      if (profileIds && profileIds.length > 0) {
        const filter = `employee_number.ilike.${term},profile_id.in.(${profileIds.join(",")})`;
        listQuery = listQuery.or(filter);
        countQuery = countQuery.or(filter);
      } else {
        listQuery = listQuery.ilike("employee_number", term);
        countQuery = countQuery.ilike("employee_number", term);
      }
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

    const role = request.profile?.role;
    const select = (role === "admin" || role === "teacher") ? TEACHER_SELECT_FULL : TEACHER_SELECT_LIMITED;

    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    return { data };
  });

  app.get("/:id/subjects", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers").select("id").eq("id", id).maybeSingle();
    if (teacherError) throw new AppError(500, "FETCH_FAILED", teacherError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const { data, error } = await supabaseAdmin
      .from("teacher_subjects")
      .select("subjects!subject_id (id, name, created_at)")
      .eq("teacher_id", id);
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data: (data ?? []).map((r) => r.subjects) });
  });

  app.get("/:id/classes", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers").select("id").eq("id", id).maybeSingle();
    if (teacherError) throw new AppError(500, "FETCH_FAILED", teacherError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const { data, error } = await supabaseAdmin
      .from("teacher_classes")
      .select(`
        classes!class_id (
          id, name, capacity, created_at,
          academic_years!academic_year_id (id, name, is_current),
          grades!grade_id (id, level)
        )
      `)
      .eq("teacher_id", id);
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data: (data ?? []).map((r) => r.classes) });
  });
}
