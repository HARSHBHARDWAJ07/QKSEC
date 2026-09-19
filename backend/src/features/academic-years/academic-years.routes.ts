import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const SELECT = "id, name, starts_on, ends_on, is_current, created_at";

export async function academicYearsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async () => {
    const { data, error } = await supabaseAdmin
      .from("academic_years")
      .select(SELECT)
      .order("starts_on", { ascending: false });
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return { data: data ?? [] };
  });

  app.get("/current", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (_request, reply) => {
    const { data, error } = await supabaseAdmin
      .from("academic_years")
      .select(SELECT)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "NO_CURRENT_YEAR", "No academic year is currently active");
    return reply.send({ data });
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const { data, error } = await supabaseAdmin
      .from("academic_years")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found");
    return reply.send({ data });
  });
}
