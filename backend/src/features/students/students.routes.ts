import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { parseQuery, assertUuid } from "../../common/http/validation.js";
import { getAccessibleStudentIds, assertStudentAccess } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

// Admin/teacher: full profile including contact details
const STUDENT_SELECT_FULL = `id, student_number, enrollment_date, active, class_id, profile_id,
  profiles!profile_id (id, first_name, last_name, role, phone, address, avatar_path, sex)`;

// Student/parent: name and avatar only — no peer PII
const STUDENT_SELECT_LIMITED = `id, student_number, enrollment_date, active, class_id, profile_id,
  profiles!profile_id (id, first_name, last_name, avatar_path)`;

const studentsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  classId: z.string().uuid().optional(),
  active: z.enum(["true", "false"]).optional(),
});

export async function studentsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(studentsQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);
    const role = request.profile?.role;

    // Students see only themselves; parents see only their children
    const accessibleStudentIds = await getAccessibleStudentIds(request);
    if (accessibleStudentIds !== null && accessibleStudentIds.length === 0) {
      return { data: [], meta: createPaginationMeta(page, pageSize, 0) };
    }

    const select = (role === "admin" || role === "teacher") ? STUDENT_SELECT_FULL : STUDENT_SELECT_LIMITED;

    // Profile name search requires a pre-query since names live in the profiles table
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

    let listQuery = supabaseAdmin.from("students").select(select).order("student_number", { ascending: true });
    let countQuery = supabaseAdmin.from("students").select("id", { count: "exact", head: true });

    // Scope to accessible students for non-admin/teacher roles
    if (accessibleStudentIds !== null) {
      listQuery = listQuery.in("id", accessibleStudentIds);
      countQuery = countQuery.in("id", accessibleStudentIds);
    }
    if (q.classId) {
      listQuery = listQuery.eq("class_id", q.classId);
      countQuery = countQuery.eq("class_id", q.classId);
    }
    if (q.active !== undefined) {
      const isActive = q.active === "true";
      listQuery = listQuery.eq("active", isActive);
      countQuery = countQuery.eq("active", isActive);
    }
    if (q.search) {
      const term = `%${q.search}%`;
      if (profileIds && profileIds.length > 0) {
        const filter = `student_number.ilike.${term},profile_id.in.(${profileIds.join(",")})`;
        listQuery = listQuery.or(filter);
        countQuery = countQuery.or(filter);
      } else {
        listQuery = listQuery.ilike("student_number", term);
        countQuery = countQuery.ilike("student_number", term);
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

    // Enforce ownership/access before fetching
    await assertStudentAccess(request, id);

    const role = request.profile?.role;
    const select = (role === "admin" || role === "teacher") ? STUDENT_SELECT_FULL : STUDENT_SELECT_LIMITED;

    const { data, error } = await supabaseAdmin
      .from("students")
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");

    return reply.send({ data });
  });
}
