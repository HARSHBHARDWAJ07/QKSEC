import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const PARENT_SELECT = `id, active, profile_id, created_at,
  profiles!profile_id (id, first_name, last_name, phone, address, avatar_path)`;

// Returns the parent row for the given :id, enforcing that a parent role caller can only
// access their own record.
async function resolveParent(id: string, callerRole: string | undefined, callerUserId: string | undefined) {
  const { data, error } = await supabaseAdmin
    .from("parents")
    .select("id, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(500, "FETCH_FAILED", error.message);
  if (!data) throw new AppError(404, "PARENT_NOT_FOUND", "Parent not found");

  if (callerRole === "parent" && data.profile_id !== callerUserId) {
    throw new AppError(403, "FORBIDDEN", "You can only access your own parent record");
  }

  return data;
}

export async function parentsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request) => {
    const pagination = parsePagination(request.query);
    const range = getPaginationRange(pagination.page, pagination.pageSize);

    const [listResult, countResult] = await Promise.all([
      supabaseAdmin
        .from("parents")
        .select(PARENT_SELECT)
        .order("created_at", { ascending: false })
        .range(range.from, range.to),
      supabaseAdmin
        .from("parents")
        .select("id", { count: "exact", head: true }),
    ]);

    if (listResult.error) throw new AppError(500, "FETCH_FAILED", listResult.error.message);
    if (countResult.error) throw new AppError(500, "FETCH_FAILED", countResult.error.message);

    return {
      data: listResult.data ?? [],
      meta: createPaginationMeta(pagination.page, pagination.pageSize, countResult.count ?? 0),
    };
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    await resolveParent(id, request.profile?.role, request.user?.id);

    const { data, error } = await supabaseAdmin
      .from("parents")
      .select(PARENT_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "PARENT_NOT_FOUND", "Parent not found");
    return reply.send({ data });
  });

  app.get("/:id/students", {
    preHandler: [requireRoles("admin", "teacher", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    await resolveParent(id, request.profile?.role, request.user?.id);

    const { data, error } = await supabaseAdmin
      .from("parent_students")
      .select(`
        relationship, is_primary,
        students!student_id (
          id, student_number, enrollment_date, active, class_id,
          profiles!profile_id (id, first_name, last_name, avatar_path)
        )
      `)
      .eq("parent_id", id);
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data: data ?? [] });
  });
}
