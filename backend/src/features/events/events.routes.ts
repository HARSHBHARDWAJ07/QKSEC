import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { parseQuery, assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { getAccessibleClassIds } from "../../common/services/studentAccess.js";
import { supabaseAdmin } from "../../config/supabase.js";

const SELECT = "id, title, description, starts_at, ends_at, class_id, created_by";

const eventsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function eventsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const q = parseQuery(eventsQuerySchema, request.query);
    const range = getPaginationRange(page, pageSize);
    const role = request.profile?.role;

    // Resolve access control filter once
    let classIds: string[] | null = null;
    if (role === "student" || role === "parent") {
      classIds = (await getAccessibleClassIds(request)) ?? [];
    }

    let listQuery = supabaseAdmin.from("events").select(SELECT).order("starts_at", { ascending: true });
    let countQuery = supabaseAdmin.from("events").select("id", { count: "exact", head: true });

    // Apply access control
    if (classIds !== null) {
      if (classIds.length > 0) {
        const filter = `class_id.is.null,class_id.in.(${classIds.join(",")})`;
        listQuery = listQuery.or(filter);
        countQuery = countQuery.or(filter);
      } else {
        listQuery = listQuery.is("class_id", null);
        countQuery = countQuery.is("class_id", null);
      }
    }

    // Apply date range filters
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
      .from("events")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    const role = request.profile?.role;
    if (role === "student" || role === "parent") {
      const classIds = (await getAccessibleClassIds(request)) ?? [];
      if (data.class_id !== null && !classIds.includes(data.class_id)) {
        throw new AppError(403, "FORBIDDEN", "You do not have access to this event");
      }
    }

    return reply.send({ data });
  });
}
