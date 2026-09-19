import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const SELECT = "id, level, created_at";

export async function gradesRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async () => {
    const { data, error } = await supabaseAdmin
      .from("grades")
      .select(SELECT)
      .order("level", { ascending: true });
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return { data: data ?? [] };
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);
    const { data, error } = await supabaseAdmin
      .from("grades")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "GRADE_NOT_FOUND", "Grade not found");
    return reply.send({ data });
  });
}
